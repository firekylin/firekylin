'use strict';

const crypto = require('crypto');

const DEFAULT_OAUTH_URL = 'https://oauth.lithub.cc';
const CACHE_TTL = 5 * 60 * 1000;
let serviceCache;
let serviceCacheTime = 0;

function validProvider(value) {
  return typeof value === 'string' && /^[a-z][a-z0-9_-]{0,31}$/i.test(value);
}

function appendQuery(url, values) {
  const result = new URL(url);
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null) result.searchParams.set(key, String(value));
  });
  return result.toString();
}

function stateSignature(secret, value) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

module.exports = class extends think.Service {
  oauthUrl() {
    return String(process.env.OAUTH_URL || DEFAULT_OAUTH_URL).replace(/\/$/, '');
  }

  async createState(userId) {
    const options = await this.model('options').getOptions(true);
    const secret = options.jwt_secret || options.comment_jwt_secret;
    const value = Buffer.from(JSON.stringify({
      userId: userId ? Number(userId) : null,
      expires: Date.now() + 10 * 60 * 1000,
      nonce: crypto.randomBytes(16).toString('hex')
    })).toString('base64url');
    return `${value}.${stateSignature(secret, value)}`;
  }

  async verifyState(state) {
    if (typeof state !== 'string' || state.length > 4096) return null;
    const [value, signature] = state.split('.');
    if (!value || !signature) return null;
    const options = await this.model('options').getOptions(true);
    const secret = options.jwt_secret || options.comment_jwt_secret;
    const expected = stateSignature(secret, value);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
    try {
      const payload = JSON.parse(Buffer.from(value, 'base64url').toString());
      if (!Number.isSafeInteger(payload.expires) || payload.expires < Date.now()) return null;
      if (payload.userId !== null && (!Number.isSafeInteger(payload.userId) || payload.userId <= 0)) return null;
      return payload;
    } catch {
      return null;
    }
  }

  async services({refresh = false} = {}) {
    if (!refresh && serviceCache && Date.now() - serviceCacheTime < CACHE_TTL) return serviceCache;
    const response = await fetch(this.oauthUrl(), {
      headers: {'user-agent': 'Firekylin'},
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error(`OAuth service returned ${response.status}`);
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.services)) throw new Error('Invalid OAuth service response');
    serviceCache = payload.services.filter(item => item && validProvider(item.name))
      .map(item => ({name: item.name, title: item.title || item.name}));
    serviceCacheTime = Date.now();
    return serviceCache;
  }

  async assertProvider(provider) {
    if (!validProvider(provider)) throw Object.assign(new Error('Invalid social login provider'), {status: 400});
    const services = await this.services();
    if (!services.some(item => item.name === provider)) {
      throw Object.assign(new Error('Social login provider is not available'), {status: 400});
    }
  }

  async profile(input) {
    await this.assertProvider(input.type);
    const url = appendQuery(`${this.oauthUrl()}/${input.type}`, {code: input.code, state: input.state});
    const response = await fetch(url, {
      headers: {'user-agent': 'Firekylin'},
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw Object.assign(new Error('Social login failed'), {status: 502});
    const profile = await response.json();
    if (!profile || profile.id === undefined || profile.id === null) {
      throw Object.assign(new Error('Social login failed'), {status: 400});
    }
    return {...profile, id: String(profile.id)};
  }

  async list(userIds) {
    const ids = (Array.isArray(userIds) ? userIds : [userIds]).map(Number).filter(Boolean);
    if (!ids.length) return [];
    return this.model('user_social')
      .where({user_id: ['IN', ids]})
      .order('provider ASC')
      .select();
  }

  async unlink(userId, provider) {
    if (!validProvider(provider)) throw Object.assign(new Error('Invalid social login provider'), {status: 400});
    return this.model('user_social').where({user_id: Number(userId), provider}).delete();
  }

  async authorize(input, ctx, users, tokenService) {
    const profile = await this.profile(input);
    const socialModel = this.model('user_social');
    const linked = await socialModel.where({provider: input.type, account_id: profile.id}).find();
    const current = ctx.state.userInfo;
    if (!think.isEmpty(linked)) {
      if (current && String(current.objectId) !== String(linked.user_id)) {
        throw Object.assign(new Error('This social account is already linked to another user'), {status: 409});
      }
      const [user] = await users.select({objectId: String(linked.user_id), type: ['!=', 'banned']});
      if (!user) throw Object.assign(new Error('This account has been disabled'), {status: 403});
      return {token: await tokenService.sign(user.objectId), user, linked: Boolean(current)};
    }

    if (current) {
      await socialModel.where({user_id: Number(current.objectId), provider: input.type}).delete();
      await socialModel.add({
        user_id: Number(current.objectId),
        provider: input.type,
        account_id: profile.id,
        created_at: think.datetime()
      });
      if (!current.avatar && profile.avatar) await users.update({avatar: profile.avatar}, {objectId: current.objectId});
      return {user: current, linked: true};
    }

    let email = String(profile.email || '').trim();
    const userModel = this.model('user');
    if (!email || Number(await userModel.where({email}).count()) > 0) {
      const digest = crypto.createHash('sha256')
        .update(`${input.type}:${profile.id}`)
        .digest('hex')
        .slice(0, 20);
      email = `${input.type}-${digest}@users.noreply.firekylin.local`;
    }
    const user = await users.add({
      email,
      display_name: profile.name || `${input.type} user`,
      url: profile.url || '',
      avatar: profile.avatar || '',
      password: ''
    });
    await socialModel.add({
      user_id: Number(user.objectId),
      provider: input.type,
      account_id: profile.id,
      created_at: think.datetime()
    });
    return {token: await tokenService.sign(user.objectId), user, linked: false};
  }
};

module.exports.appendQuery = appendQuery;
module.exports.validProvider = validProvider;
