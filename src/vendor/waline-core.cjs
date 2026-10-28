"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// waline-source-20261011/packages/core/src/index.ts
var index_exports = {};
__export(index_exports, {
  WalineError: () => WalineError,
  createWalineCore: () => createWalineCore
});
module.exports = __toCommonJS(index_exports);

// waline-source-20261011/packages/core/src/error.ts
var WalineError = class extends Error {
  constructor(code, status, messageKey, details) {
    super(messageKey ?? code);
    this.code = code;
    this.status = status;
    this.messageKey = messageKey;
    this.details = details;
    this.name = "WalineError";
  }
};
var badRequest = (details) => {
  throw new WalineError("VALIDATION_ERROR", 400, void 0, details);
};
var unauthorized = () => {
  throw new WalineError("UNAUTHORIZED", 401);
};
var forbidden = () => {
  throw new WalineError("FORBIDDEN", 403);
};
var capability = (name) => {
  throw new WalineError("CAPABILITY_UNAVAILABLE", 501, void 0, { capability: name });
};

// waline-source-20261011/packages/core/src/utils/auth.ts
var empty = (value) => value === void 0 || value === null || value === "" || Array.isArray(value) && value.length === 0 || typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0;
var currentUser = (ctx) => empty(ctx.state.userInfo) ? void 0 : ctx.state.userInfo;
var isAdmin = (ctx) => currentUser(ctx)?.type === "administrator";
var requireUser = (ctx) => currentUser(ctx) ?? unauthorized();
var requireAdmin = (ctx) => {
  const user = requireUser(ctx);
  if (user.type !== "administrator") forbidden();
  return user;
};

// waline-source-20261011/packages/core/src/utils/avatar.ts
var createAvatarFormatter = ({ config, services }) => async (value) => {
  const url = "avatar" in value && typeof value.avatar === "string" ? value.avatar : services.avatar ? await services.avatar.stringify(value) : "";
  return config.avatarProxy && url && !url.includes(config.avatarProxy) ? `${config.avatarProxy}?url=${encodeURIComponent(url)}` : url;
};

// waline-source-20261011/packages/core/src/utils/validation.ts
var requiredString = (value, field) => {
  if (typeof value !== "string" || value.length === 0) badRequest({ field, rule: "required" });
  return value;
};
var positiveInt = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  if (value === void 0) return fallback;
  const result = Number(value);
  if (!Number.isInteger(result) || result < 1 || result > max) {
    badRequest({ rule: "int", max });
  }
  return result;
};
var requiredCapability = (value, name) => value ?? capability(name);
var levelFor = (levels, count) => {
  let result = 0;
  if (!count) {
    return result;
  }
  for (let index = 0; index < levels.length; index += 1) {
    if (levels[index] <= count) result = index;
  }
  return result;
};

// waline-source-20261011/packages/core/src/handlers/auth.ts
var createAuthHandler = (runtime) => {
  const { models, services } = runtime;
  const avatar = createAvatarFormatter(runtime);
  return {
    async resolveSession(input, ctx) {
      if (!input.token) return;
      const tokenService = requiredCapability(services.token, "token");
      let id;
      try {
        id = await tokenService.verify(input.token);
      } catch {
        return;
      }
      const [account] = await models.Users.select(
        {
          objectId: id,
          type: ["!=", "banned"]
        },
        {
          field: [
            "id",
            "email",
            "url",
            "display_name",
            "type",
            "avatar",
            "2fa",
            "label",
            ...ctx.state.oauthServices?.map(({ name }) => name) ?? []
          ]
        }
      );
      if (!account) return;
      return { ...account, avatar: await avatar(account), token: input.token };
    },
    async login(input, _ctx) {
      const email = requiredString(input.email, "email");
      requiredString(input.password, "password");
      const passwordService = requiredCapability(services.password, "password");
      const tokenService = requiredCapability(services.token, "token");
      const [account] = await models.Users.select({ email }, { field: ["id", "email", "url", "display_name", "type", "avatar", "password", "2fa", "label"] });
      if (!account || account.type.startsWith("verify:") || account.type === "banned" || !account.password || !await passwordService.verify(input.password, account.password)) {
        throw new WalineError("LOGIN_FAILED", 400);
      }
      if (account["2fa"]) {
        const twoFactor = requiredCapability(services.twoFactor, "twoFactor");
        if (!input.code || !await twoFactor.verify(account["2fa"], input.code)) {
          throw new WalineError("TWO_FACTOR_AUTH_ERROR", 400);
        }
      }
      return {
        ...account,
        password: void 0,
        avatar: await avatar(account),
        token: await tokenService.sign(account.objectId)
      };
    },
    async getTwoFactorStatus(input, ctx) {
      if (!currentUser(ctx) && !input.email) unauthorized();
      const email = input.email ?? currentUser(ctx)?.email;
      const [account] = await models.Users.select({ email });
      return { enable: Boolean(account?.["2fa"]) };
    },
    async createTwoFactorSecret(_input, ctx) {
      const user = requireUser(ctx);
      const twoFactor = requiredCapability(services.twoFactor, "twoFactor");
      if (user["2fa"] && user["2fa"].length === 32) {
        return {
          otpauth_url: `otpauth://totp/waline_${user.objectId}?secret=${user["2fa"]}`,
          secret: user["2fa"]
        };
      }
      return twoFactor.create(user.objectId);
    },
    async enableTwoFactor(input, ctx) {
      const user = requireUser(ctx);
      const twoFactor = requiredCapability(services.twoFactor, "twoFactor");
      if (!await twoFactor.verify(input.secret, input.code)) {
        throw new WalineError("TWO_FACTOR_AUTH_ERROR", 400, "TWO_FACTOR_AUTH_ERROR_DETAIL");
      }
      await models.Users.update({ "2fa": input.secret }, { objectId: user.objectId });
    },
    async requestPasswordReset(input, ctx) {
      const [account] = await models.Users.select({
        email: requiredString(input.email, "email")
      });
      if (!account) throw new WalineError("USER_NOT_EXIST", 400);
      const notification = requiredCapability(services.notification, "notification");
      const reset = requiredCapability(
        notification.passwordReset?.bind(notification),
        "notification.passwordReset"
      );
      const tokenService = requiredCapability(services.token, "token");
      const profileUrl = `${ctx.serverUrl ?? ""}/ui/profile?token=${await tokenService.sign(account.objectId)}`;
      await reset(account, profileUrl);
    }
  };
};

// waline-source-20261011/packages/core/src/utils/comment.ts
var createCommentFormatter = (runtime) => {
  const { config, services } = runtime;
  const avatar = createAvatarFormatter(runtime);
  return async (source, ctx, users = []) => {
    const { ua: uaText, ip, ...rest } = source;
    const result = {
      ...rest,
      ua: uaText,
      ip
    };
    const author = users.find((item) => item.objectId === source.user_id);
    if (author) {
      result.nick = author.display_name;
      result.mail = author.email;
      result.link = author.url;
      result.type = author.type;
      result.label = author.label;
    }
    const parsed = services.userAgent?.parse(uaText);
    if (!config.disableUserAgent && parsed) {
      result.browser = [parsed.browser?.name, (parsed.browser?.version ?? "").split(".").slice(0, 2).join(".")].filter(Boolean).join(" ");
      result.os = [parsed.os?.name, parsed.os?.version].filter(Boolean).join(" ");
    }
    result.avatar = await avatar(author ?? source);
    if (currentUser(ctx)) result.orig = result.comment;
    if (!isAdmin(ctx)) delete result.mail;
    if ((isAdmin(ctx) || !config.disableRegion) && ip && services.region) {
      result.addr = await services.region.lookup(ip, isAdmin(ctx) ? 3 : 1);
    }
    if (services.markdown) {
      result.comment = await services.markdown.render(result.comment);
    }
    result.like = Number(result.like) || 0;
    if (typeof result.sticky === "string") result.sticky = Boolean(Number(result.sticky));
    result.time = new Date(result.insertedAt).getTime();
    if (!ctx.state.deprecated) delete result.insertedAt;
    delete result.createdAt;
    delete result.updatedAt;
    if (!isAdmin(ctx)) delete result.ip;
    return result;
  };
};

// waline-source-20261011/packages/core/src/handlers/comment.ts
var createCommentHandler = (runtime) => {
  const { config, hook, logger, models, now, random, services } = runtime;
  const formatComment = createCommentFormatter(runtime);
  return {
    async list(input, ctx) {
      const path = requiredString(input.path, "path");
      const page = positiveInt(input.page, 1);
      const pageSize = positiveInt(input.pageSize, 10, 100);
      const sortBy = input.sortBy ?? "insertedAt_desc";
      if (!["insertedAt_desc", "insertedAt_asc", "like_desc"].includes(sortBy)) {
        badRequest({ field: "sortBy" });
      }
      const [sortField, direction] = sortBy.split("_");
      const where = { url: path };
      const current = currentUser(ctx);
      if (!current) where.status = ["NOT IN", ["waiting", "spam"]];
      else if (!isAdmin(ctx)) {
        where._complex = {
          _logic: "or",
          status: ["NOT IN", ["waiting", "spam"]],
          user_id: current.objectId
        };
      }
      const rootWhere = { ...where, rid: void 0 };
      const [total, roots, rootCount] = await Promise.all([
        models.Comment.count(where),
        models.Comment.select(rootWhere, {
          limit: pageSize,
          offset: Math.max((page - 1) * pageSize, 0),
          order: [
            { field: "sticky", direction: "desc", nulls: "last" },
            { field: sortField, direction },
            { field: "objectId", direction }
          ]
        }),
        models.Comment.count(rootWhere)
      ]);
      const rootIds = roots.map(({ objectId }) => objectId);
      const children = rootIds.length ? await models.Comment.select({ ...where, rid: ["IN", rootIds] }) : [];
      const ids = [
        ...new Set(
          [...roots, ...children].map(({ user_id }) => user_id).filter((id) => Boolean(id))
        )
      ];
      const users = ids.length ? await models.Users.select({ objectId: ["IN", ids] }) : [];
      const comments = [...roots, ...children];
      if (Array.isArray(config.levels)) {
        const mails = [...new Set(comments.map(({ mail }) => mail).filter(Boolean))];
        const countWhere = { status: ["NOT IN", ["waiting", "spam"]] };
        if (ids.length || mails.length) {
          countWhere._complex = { _logic: "or" };
          if (ids.length) countWhere._complex.user_id = ["IN", ids];
          if (mails.length) countWhere._complex.mail = ["IN", mails];
        }
        const counts = await models.Comment.count(countWhere, {
          group: ["user_id", "mail"]
        });
        for (const comment of comments) {
          const count = counts.find(
            (item) => comment.user_id ? item.user_id === comment.user_id : item.mail === comment.mail
          )?.count;
          comment.level = levelFor(config.levels, count ?? 0);
        }
      }
      const data = await Promise.all(
        roots.map(async (root) => {
          const item = await formatComment(root, ctx, users);
          const formattedChildren = await Promise.all(
            children.filter(({ rid }) => rid === root.objectId).map((child) => formatComment(child, ctx, users))
          );
          item.children = formattedChildren;
          const map = new Map([
            [item.objectId, item],
            ...formattedChildren.map((child) => [child.objectId, child])
          ]);
          for (const child of formattedChildren) {
            const parent = map.get(child.pid);
            if (parent) {
              child.reply_user = {
                nick: parent.nick,
                link: parent.link,
                avatar: parent.avatar
              };
            }
          }
          return item;
        })
      );
      return {
        page,
        totalPages: Math.ceil(rootCount / pageSize),
        pageSize,
        count: total,
        data
      };
    },
    async listRecent(input, ctx) {
      const count = positiveInt(input.count, 10, 50);
      const current = currentUser(ctx);
      const where = current ? {
        _complex: {
          _logic: "or",
          status: ["NOT IN", ["waiting", "spam"]],
          user_id: current.objectId
        }
      } : { status: ["NOT IN", ["waiting", "spam"]] };
      const rows = await models.Comment.select(where, {
        desc: "insertedAt",
        limit: count
      });
      const ids = [
        ...new Set(rows.map(({ user_id }) => user_id).filter((id) => Boolean(id)))
      ];
      const users = ids.length ? await models.Users.select({ objectId: ["IN", ids] }) : [];
      return Promise.all(rows.map((item) => formatComment(item, ctx, users)));
    },
    async listForAdmin(input, ctx) {
      const current = requireAdmin(ctx);
      const page = positiveInt(input.page, 1);
      const pageSize = positiveInt(input.pageSize, 10, 100);
      const where = {};
      if (input.owner === "mine") where.mail = current.email;
      if (input.status) {
        where.status = input.status === "approved" ? ["NOT IN", ["waiting", "spam"]] : input.status;
      }
      if (input.keyword) where.comment = ["LIKE", `%${input.keyword}%`];
      const [count, spamCount, waitingCount, rows] = await Promise.all([
        models.Comment.count(where),
        models.Comment.count({ status: "spam" }),
        models.Comment.count({ status: "waiting" }),
        models.Comment.select(where, {
          desc: "insertedAt",
          limit: pageSize,
          offset: Math.max((page - 1) * pageSize, 0)
        })
      ]);
      return {
        page,
        totalPages: Math.ceil(count / pageSize),
        pageSize,
        spamCount,
        waitingCount,
        data: await Promise.all(rows.map((item) => formatComment(item, ctx)))
      };
    },
    async count(input, ctx) {
      const urls = Array.isArray(input.url) ? input.url : input.url ? [input.url] : [];
      const where = urls.length ? { url: ["IN", urls] } : {};
      const current = currentUser(ctx);
      if (current) {
        where._complex = {
          _logic: "or",
          status: ["NOT IN", ["waiting", "spam"]],
          user_id: current.objectId
        };
      } else {
        where.status = ["NOT IN", ["waiting", "spam"]];
      }
      if (urls.length === 1) {
        const count = await models.Comment.count(where);
        return ctx.state.deprecated ? count : [count];
      }
      if (urls.length > 1) {
        const counts = await models.Comment.count(where, {
          group: ["url"]
        });
        const map = new Map(counts.map((item) => [item.url, item.count]));
        return urls.map((url) => map.get(url) ?? 0);
      }
      return models.Comment.count(where);
    },
    async create(input, ctx) {
      const rawComment = requiredString(input.comment, "comment");
      const url = requiredString(input.url, "url");
      const current = currentUser(ctx);
      if (!current && config.forceLogin) unauthorized();
      if (!current && services.captcha && !await services.captcha.verify(input.captcha, ctx)) {
        forbidden();
      }
      const data = {
        comment: rawComment,
        link: input.link,
        mail: input.mail,
        nick: input.nick,
        pid: input.pid,
        rid: input.rid,
        ua: input.ua,
        url,
        ip: ctx.ip,
        insertedAt: now(),
        user_id: current?.objectId
      };
      if (data.pid && ctx.state.deprecated) {
        data.comment = `[@${input.at ?? ""}](#${data.pid}): ${data.comment}`;
      }
      if (isAdmin(ctx)) {
        data.status = "approved";
      } else {
        if (ctx.ip && config.disallowIPList?.includes(ctx.ip)) forbidden();
        const duplicate = await models.Comment.select({
          url,
          mail: data.mail,
          nick: data.nick,
          link: data.link,
          comment: data.comment
        });
        if (duplicate.length) {
          throw new WalineError("DUPLICATE_CONTENT", 400, "Duplicate Content");
        }
        if (ctx.ip) {
          const recent = await models.Comment.select({
            ip: ctx.ip,
            insertedAt: [">", new Date(now().getTime() - (config.ipQps ?? 60) * 1e3)]
          });
          if (recent.length) {
            throw new WalineError("COMMENT_TOO_FAST", 400, "Comment too fast!");
          }
        }
        data.status = config.audit ? "waiting" : "approved";
        if (data.status === "approved" && services.spam && await services.spam.check(data, ctx)) {
          data.status = "spam";
        }
        if (data.status !== "spam" && config.forbiddenWords?.length && new RegExp(`(${config.forbiddenWords.join("|")})`, "iu").test(rawComment)) {
          data.status = "spam";
        }
      }
      const rejected = await hook("preSave", data, void 0, ctx);
      if (rejected) {
        throw new WalineError("HOOK_REJECTED", 400, void 0, rejected);
      }
      const saved = await models.Comment.add(data);
      let parent, parentUser;
      if (data.pid) {
        [parent] = await models.Comment.select({ objectId: data.pid });
        if (parent?.user_id) {
          [parentUser] = await models.Users.select({ objectId: parent.user_id });
        }
      }
      await services.webhook?.emit("new_comment", {
        comment: { ...saved, rawComment },
        reply: parent
      });
      const cmtReturn = await formatComment(saved, ctx, current ? [current] : []);
      const parentReturn = parent ? await formatComment(parent, ctx, parentUser ? [parentUser] : []) : void 0;
      if (data.status !== "spam" && services.notification) {
        await services.notification.send(
          { ...cmtReturn, mail: saved.mail, rawComment },
          parentReturn && parent ? { ...parentReturn, mail: parent.mail } : void 0
        );
      }
      await hook("postSave", saved, parent, ctx);
      logger.debug("Comment added", saved.objectId);
      return formatComment(saved, ctx, current ? [current] : []);
    },
    async update(input, ctx) {
      const id = requiredString(input.objectId, "objectId");
      const [old] = await models.Comment.select({ objectId: id });
      if (!old) return;
      const isLikeOnly = typeof input.data.like === "boolean" && Object.keys(input.data).length === 1;
      const current = currentUser(ctx);
      if (!isLikeOnly) {
        const user = current ?? requireUser(ctx);
        if (!isAdmin(ctx) && old.user_id !== user.objectId) forbidden();
      }
      const data = isAdmin(ctx) ? { ...input.data } : { comment: input.data.comment, like: input.data.like };
      if (typeof input.data.like === "boolean") {
        data.like = Math.max(
          (Number(old.like) || 0) + (input.data.like ? Math.ceil(random() * (config.likeIncMax ?? 1)) : -1),
          0
        );
      }
      const rejected = await hook("preUpdate", { ...data, objectId: id }, void 0, ctx);
      if (rejected) {
        throw new WalineError("HOOK_REJECTED", 400, void 0, rejected);
      }
      const [updated] = await models.Comment.update(data, { objectId: id });
      if (!updated) return;
      if (old.status === "waiting" && data.status === "approved" && old.pid && services.notification) {
        const [parent] = await models.Comment.select({ objectId: old.pid });
        if (parent) await services.notification.send(updated, parent, true);
      }
      await hook("postUpdate", data, void 0, ctx);
      return formatComment(updated, ctx);
    },
    async remove(input, ctx) {
      const id = requiredString(input.objectId, "objectId");
      const current = requireUser(ctx);
      if (!isAdmin(ctx)) {
        const owned = await models.Comment.select({
          objectId: id,
          user_id: current.objectId
        });
        if (!owned.length) forbidden();
      }
      const rejected = await hook("preDelete", id, void 0, ctx);
      if (rejected) {
        throw new WalineError("HOOK_REJECTED", 400, void 0, rejected);
      }
      await models.Comment.delete({
        _complex: { _logic: "or", objectId: id, pid: id, rid: id }
      });
      await hook("postDelete", id, void 0, ctx);
    }
  };
};

// waline-source-20261011/packages/core/src/handlers/counter.ts
var createCounterHandler = ({ models, now }) => ({
  async get(input, ctx) {
    const paths = typeof input.path === "string" ? input.path.split(",") : input.path ?? [];
    const types = typeof input.type === "string" ? input.type.split(",") : input.type?.length ? input.type : ["time"];
    if (!paths.length) return 0;
    const rows = await models.Counter.select({ url: ["IN", paths] });
    const byUrl = new Map(rows.map((item) => [item.url, item]));
    const data = paths.map((path) => {
      const values = {};
      for (const type of types) {
        values[type] = Number(byUrl.get(path)?.[type]) || 0;
      }
      return types.length === 1 && ctx.state.deprecated ? values[types[0]] : values;
    });
    return paths.length === 1 && ctx.state.deprecated ? data[0] : data;
  },
  async update(input, ctx) {
    const path = requiredString(input.path, "path");
    const type = input.type ?? "time";
    const action = input.action ?? "inc";
    if (!["inc", "desc"].includes(action)) badRequest({ field: "action" });
    const rows = await models.Counter.select({ url: path });
    if (!rows.length) {
      if (action === "desc") return ctx.state.deprecated ? 0 : [0];
      await models.Counter.add({ url: path, [type]: 1 }, { access: { read: true, write: true } });
      return ctx.state.deprecated ? 1 : [{ [type]: 1 }];
    }
    const updated = await models.Counter.update(
      (item) => ({
        [type]: action === "desc" ? (Number(item[type]) || 1) - 1 : (Number(item[type]) || 0) + 1,
        updatedAt: now()
      }),
      { objectId: ["IN", rows.map(({ objectId }) => objectId)] }
    );
    const value = Number(updated[0]?.[type]) || 0;
    return ctx.state.deprecated ? value : [{ [type]: value }];
  }
});

// waline-source-20261011/packages/core/src/handlers/database.ts
var createDatabaseHandler = ({ models, now }) => ({
  async export(_input, ctx) {
    requireAdmin(ctx);
    const [Comment, Counter, Users] = await Promise.all([
      models.Comment.select({}),
      models.Counter.select({}),
      models.Users.select({})
    ]);
    return {
      type: "waline",
      version: 1,
      time: now().getTime(),
      tables: ["Comment", "Counter", "Users"],
      data: { Comment, Counter, Users }
    };
  },
  async import(input, ctx) {
    requireAdmin(ctx);
    const model = requiredCapability(models.get?.(input.table), `model:${input.table}`);
    const { objectId: _objectId, ...data } = input.data;
    return model.add(data);
  },
  async update(input, ctx) {
    requireAdmin(ctx);
    const model = requiredCapability(models.get?.(input.table), `model:${input.table}`);
    const {
      objectId: _objectId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...data
    } = input.data;
    return model.update(data, { objectId: input.objectId });
  },
  async clear(input, ctx) {
    requireAdmin(ctx);
    const model = requiredCapability(models.get?.(input.table), `model:${input.table}`);
    return model.delete({});
  }
});

// waline-source-20261011/packages/core/src/handlers/oauth.ts
var createOAuthHandler = ({ models, random, services }) => ({
  async authorize(input, ctx) {
    const oauthService = requiredCapability(services.oauth, "oauth");
    const tokenService = requiredCapability(services.token, "token");
    const profile = await oauthService.authorize(input, ctx);
    if (!profile?.id) {
      throw new WalineError("OAUTH_FAILED", 400, void 0, profile);
    }
    const [linked] = await models.Users.select({
      [input.type]: profile.id
    });
    if (linked) {
      return { token: await tokenService.sign(linked.objectId), user: linked };
    }
    const user = currentUser(ctx);
    if (user) {
      const update = {
        [input.type]: profile.id,
        ...!user.avatar && profile.avatar ? { avatar: profile.avatar } : {}
      };
      const [updated] = await models.Users.update(update, {
        objectId: user.objectId
      });
      return { user: updated };
    }
    const count = await models.Users.count();
    const passwordService = services.password;
    const created = await models.Users.add({
      email: profile.email,
      display_name: profile.name,
      url: profile.url,
      avatar: profile.avatar,
      [input.type]: profile.id,
      password: passwordService ? await passwordService.hash(String(random())) : void 0,
      type: count === 0 ? "administrator" : "guest"
    });
    return {
      token: await tokenService.sign(created.objectId),
      user: created
    };
  }
});

// waline-source-20261011/packages/core/src/handlers/user.ts
var createUserHandler = (runtime) => {
  const { config, models, services } = runtime;
  const avatar = createAvatarFormatter(runtime);
  return {
    async get(input, ctx) {
      requireAdmin(ctx);
      return (await models.Users.select({
        email: requiredString(input.email, "email")
      }))[0];
    },
    async list(input, ctx) {
      if (!isAdmin(ctx)) {
        const pageSize2 = positiveInt(input.pageSize, 20, 50);
        const counts = await models.Comment.count(
          { status: ["NOT IN", ["waiting", "spam"]] },
          { group: ["user_id", "mail"] }
        );
        counts.sort((a, b) => b.count - a.count);
        const top = counts.slice(0, pageSize2);
        const ids = top.map((item) => item.user_id).filter((id) => typeof id === "string");
        const accounts = ids.length ? await models.Users.select({ objectId: ["IN", ids] }) : [];
        const result = [];
        for (const item of top) {
          const account = accounts.find(({ objectId }) => objectId === item.user_id);
          const entry = { count: item.count };
          if (config.levels) entry.level = levelFor(config.levels, item.count);
          if (account) {
            Object.assign(entry, {
              nick: account.display_name,
              link: account.url,
              avatar: await avatar(account),
              label: account.label
            });
          } else if (typeof item.mail === "string") {
            const [lastComment] = await models.Comment.select({ mail: item.mail }, { limit: 1 });
            if (!lastComment) continue;
            Object.assign(entry, {
              nick: lastComment.nick,
              link: lastComment.link,
              avatar: await avatar(lastComment)
            });
          }
          result.push(entry);
        }
        return result;
      }
      const page = positiveInt(input.page, 1);
      const pageSize = positiveInt(input.pageSize, 10, 100);
      const count = await models.Users.count();
      const data = await models.Users.select(
        {},
        {
          desc: "createdAt",
          limit: pageSize,
          offset: (page - 1) * pageSize
        }
      );
      return {
        page,
        totalPages: Math.ceil(count / pageSize),
        pageSize,
        data: await Promise.all(
          data.map(async (item) => ({ ...item, avatar: await avatar(item) }))
        )
      };
    },
    async register(input, ctx) {
      const email = requiredString(input.email, "email");
      const passwordService = requiredCapability(services.password, "password");
      const existing = await models.Users.select({ email });
      if (existing.some(({ type }) => ["administrator", "guest"].includes(type))) {
        throw new WalineError("USER_EXIST", 400, "USER_EXIST");
      }
      const count = await models.Users.count();
      const data = {
        ...input,
        password: await passwordService.hash(input.password),
        type: count === 0 ? "administrator" : config.normalUserType ?? "guest"
      };
      const saved = existing.length ? (await models.Users.update(data, { email }))[0] : await models.Users.add(data);
      if (saved.type.startsWith("verify:") && services.notification?.verification && ctx.serverUrl) {
        await services.notification.verification(saved, ctx.serverUrl);
      }
      return { verify: saved.type.startsWith("verify:") };
    },
    async update(input, ctx) {
      const user = requireUser(ctx);
      const objectId = input.objectId ?? user.objectId;
      if (objectId !== user.objectId && !isAdmin(ctx)) forbidden();
      const allowed = [
        "display_name",
        "url",
        "avatar",
        "password",
        "label",
        "email",
        "2fa",
        ...(ctx.state.oauthServices ?? []).map(({ name }) => name)
      ];
      if (isAdmin(ctx) && input.objectId) allowed.push("type");
      const data = Object.fromEntries(
        Object.entries(input.data).filter(
          ([key, value]) => allowed.includes(key) && typeof value === "string"
        )
      );
      if (data.email) {
        const duplicate = await models.Users.select({
          email: data.email,
          objectId: ["!=", user.objectId]
        });
        if (duplicate.length) throw new WalineError("USER_EXIST", 400);
      }
      if (data.password) {
        const passwordService = requiredCapability(services.password, "password");
        data.password = await passwordService.hash(data.password);
      }
      if (!Object.keys(data).length) return;
      return (await models.Users.update(data, { objectId }))[0];
    },
    async remove(input, ctx) {
      const user = requireAdmin(ctx);
      if (user.objectId === input.objectId) forbidden();
      const [target] = await models.Users.select({ objectId: input.objectId });
      if (!target) throw new WalineError("USER_NOT_EXIST", 400);
      if (target.type.startsWith("verify:")) {
        await models.Users.delete({ objectId: input.objectId });
      } else {
        await models.Users.update({ type: "banned" }, { objectId: input.objectId });
      }
    }
  };
};

// waline-source-20261011/packages/core/src/handlers/verification.ts
var createVerificationHandler = ({ models, now }) => ({
  async verifyEmail(input, _ctx) {
    const [account] = await models.Users.select({
      email: requiredString(input.email, "email")
    });
    if (!account) {
      throw new WalineError("USER_NOT_EXIST", 400, "USER_NOT_EXIST");
    }
    const match = /^verify:(?<code>\d{4}):(?<timestamp>\d+)$/iu.exec(account.type);
    if (!match) {
      throw new WalineError("USER_REGISTERED", 400, "USER_REGISTERED");
    }
    if (input.token === match.groups?.code && now().getTime() < Number(match.groups.timestamp)) {
      await models.Users.update({ type: "guest" }, { email: account.email });
      return;
    }
    throw new WalineError("TOKEN_EXPIRED", 400, "TOKEN_EXPIRED");
  }
});

// waline-source-20261011/packages/core/src/core.ts
var noop = () => void 0;
var createWalineCore = (options) => {
  const services = Object.freeze({ ...options.services });
  const logger = {
    debug: options.logger?.debug ?? noop,
    info: options.logger?.info ?? noop,
    warn: options.logger?.warn ?? noop,
    error: options.logger?.error ?? noop
  };
  const hook = async (name, payload, extra, ctx) => {
    if (!ctx) return void 0;
    const configured = options.hooks?.[name];
    const hooks = configured ? Array.isArray(configured) ? configured : [configured] : [];
    for (const callback of hooks) {
      const result = await callback(payload, extra, ctx);
      if (result) return result;
    }
    return void 0;
  };
  const runtime = {
    models: options.models,
    config: Object.freeze({ ...options.config }),
    services,
    logger,
    now: () => services.clock?.now() ?? /* @__PURE__ */ new Date(),
    random: () => services.random?.value() ?? Math.random(),
    hook
  };
  return Object.freeze({
    comment: Object.freeze(createCommentHandler(runtime)),
    counter: Object.freeze(createCounterHandler(runtime)),
    user: Object.freeze(createUserHandler(runtime)),
    auth: Object.freeze(createAuthHandler(runtime)),
    oauth: Object.freeze(createOAuthHandler(runtime)),
    verification: Object.freeze(createVerificationHandler(runtime)),
    database: Object.freeze(createDatabaseHandler(runtime))
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WalineError,
  createWalineCore
});
