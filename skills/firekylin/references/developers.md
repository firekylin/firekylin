# Theme and plugin developers

For natural-language plugin requests, follow [Plugin generation](plugin-generation.md) first. Plugin guidance below was rechecked against `e10a576` (2.17.1); verify the deployed implementation.

Prefer extending an independent site through Widgets, plugins, and shared services. node_modules edits disappear on upgrade; intentional core changes follow the maintainer workflow.

## Layout and development modes

| Component | Independent project | Core / legacy deployment |
| --- | --- | --- |
| Configuration | firekylin.config.js; preserve database/server settings | ThinkJS src/config/ and local src/config/db.js |
| Themes | themes/<theme>/ | www/theme/<theme>/ |
| Local plugins | plugins/<id>/ or configured pluginsPath | Relative to getContext().projectPath; verify deployment |
| Widgets | Project widgets entries or active-theme entry | Shared registration mechanism |
| Data/uploads | data/, uploads/ | runtime/, logs/, www/static/upload/, etc. |

Project npm run dev means firekylin -D backend development. Core pnpm dev starts Vite on 3000, proxying admin API to 8360; pnpm start runs the backend. Do not interchange these meanings.

## Theme structure

| File | Purpose |
| --- | --- |
| layout.eta | Shared layout, navigation, resources, blocks |
| index.eta | Homepage and taxonomy/author lists |
| post.eta / page.eta | Post/page detail |
| archive.eta / search.eta | Archives/search |
| cate.eta / tag.eta | Category/tag entry pages |
| inc/ | Included fragments |
| template/*.eta | Admin-selectable custom page templates |
| error/404.html, error/500.html | HTTP-status templates discovered by ThinkJS trace; preserve filenames |
| res/ | CSS, JS, icons |

Inspect/copy the active theme without overwriting custom work. Core page templates use Eta, not legacy EJS/Nunjucks. `<% ... %>` runs logic, `<%= ... %>` escapes output, `<%~ ... %>` emits trusted HTML. Layout/block/include usage follows the current adapter and default theme.

### Recent posts

```eta
<% const site = await firekylin.widget('Widget_Options'); %>
<% const posts = await firekylin.widget('Widget_Contents_Post_Recent', {pageSize: 5}); %>
<h1><%= site.title() %></h1>
<ul>
<% while (posts.next()) { %>
  <li><a href="<%= posts.permalink %>"><%= posts.title() %></a></li>
<% } %>
</ul>
```

permalink/url are string properties, not url() methods. title/content are callable FieldAccessors with .val(). next() advances the current row; use separate aliases or toArray() for repeated traversal.

| Built-in Widget | Parameters | Data/behavior |
| --- | --- | --- |
| Widget_Options | {} | title, description, keywords, navigation, themeConfig, siteUrl, themeUrl(path) |
| Widget_Archive | type: index/post/page/archive/search | Routed content, pagination, archiveTitle/Slug, grouped, keyword, pageUrl(page), is(type) |
| Widget_Contents_Post_Recent | pageSize, not limit | Recent public posts |
| Widget_Metas_Category_List | {} | Category/Meta data |
| Widget_Metas_Tag_Cloud | sort, desc, limit, ignoreZeroCount | sort: name/pathname/count/update_time; split(...sizes) computes font levels |

ContentsWidget also provides date(format), excerpt(length,trim), commentsNum(...formats), category(split,link,defaultValue), tags(split,link,defaultValue), author(item), allow(...permissions). Reuse visibility-aware APIs instead of implementing SQL permissions in templates.

site.themeUrl('res/css/all.css') supports project /themes/ and legacy /theme/ paths. Expose only public option fields, never serialize the entire options object.

```eta
<% const post = await firekylin.widget('Widget_Archive', {type: 'post'}); %>
<% if (post.next()) { %>
<article>
  <h1><%= post.title() %></h1>
  <div class="content"><%~ post.content() %></div>
</article>
<%~ firekylin.comment({className: 'article-comments', title: 'Comments'}) %>
<% } %>
```

firekylin.comment generates the Waline client according to content allow_comment/site settings. Options include className, title, loadingText, resourceURL; custom resource locations need waline.js/waline.css. Avoid double initialization. Test disabled comments, required login, and language behavior.

Theme package.json configElements declares admin controls; inspect supported text/color/css/javascript/html controls before introducing types. Read values through Widget_Options.themeConfig. Arbitrary JSON Schema does not automatically produce a form. Admin theme cloning is deprecated; copy files and change identity explicitly.

## Custom Widgets and types

Within a site project:

```sh
npx --no-install firekylin plugin recent-posts
```

This generates a Widget scaffold and adds its entry to project widgets, not a full event/route npm plugin. Entries export synchronous initialization returning a name-to-class map:

```js
module.exports = ({ContentsWidget}) => ({
  Widget_Custom_Recent: class extends ContentsWidget {
    async execute() {
      const requested = Number(this.parameter.pageSize) || 5;
      const pageSize = Math.min(Math.max(requested, 1), 20);
      const result = await this.model('post').getPostList(1, {pageSize});
      this.pushAll(result.data || []);
    }
  }
});
```

Use visibility-filtered queries such as getPostList for public Widgets. Raw select() does not exclude drafts/private posts. Merge entries with existingWidgets; preserve database/server and other configuration.

**Full-plugin caveat at e10a576:** project/theme initializers receive ContentsWidget and MetasWidget, but src/widget/registry.js exports only Widget to PluginManager. Therefore ctx.widgets.ContentsWidget and ctx.widgets.MetasWidget are undefined in this snapshot despite the manager listing them. Check runtime constructors before extending them. Use ctx.widgets.Widget and explicit row fields, or choose a project/theme Widget entry when content helpers are needed; do not silently import undocumented internal classes or claim permalink/title helpers exist on the base Widget.

Active themes may declare firekylin.widgets in package.json. Conflicts fail unless widgetOverrides explicitly allows an override; themes cannot override Widget_Options. Restart workers after server-code changes.

Widget_Custom_Recent@sidebar creates a separately cached instance; aliases are not query parameters. firekylin.widget.destroy(name?) clears instance caches. Project firekylin.d.ts references `/// <reference types="firekylin" />`; augment Firekylin.WidgetRegistry for custom instances/parameters. Types in types/index.d.ts do not replace runtime registration.

## Full plugin discovery and lifecycle

Example plugins/example/package.json, with CommonJS plugin.js:

```json
{
  "name": "firekylin-plugin-example",
  "version": "1.0.0",
  "main": "plugin.js",
  "engines": {"firekylin": "2.17.1"},
  "firekylin": {"type": "plugin", "id": "example", "entry": "plugin.js"}
}
```

Engine constraints do not prove unpublished master features exist in a released package. Verify compatibility before release.

Startup scans pluginsPath and direct project dependencies/optionalDependencies marked firekylin.type=plugin. Ordinary packages and devDependencies are not automatically plugins. With the production state store, discovered plugins without saved state default disabled; enable them in **插件管理 → 已安装插件**. Enabled lifecycle: validate manifest, load entry, register(ctx), optional activate(ctx). A bare PluginManager without a stateStore auto-activates and is not evidence of production enablement.

Context provides id, manifest, root, events, routes, templates, tools (AbilityRegistry compatibility alias), admin, widgets, logger, config. ai is optional and requires the host AI store; packages requires the host package API and packages:manage permission. config comes from pluginConfig[pluginId]. Deactivation cleans registered resources; deactivate must clean plugin-owned timers/connections/external resources.

The current admin supports install/enable/disable/delete and a configuration link for an active plugin with a settings page. State changes reload clustered workers; restart single-process sites. File installation, enablement, npm publication and official Registry inclusion are separate operations. Do not invent dependency topology or configuration setters. permissions metadata is not a Node.js sandbox.

## Events and filters

| Notification | Typical payload |
| --- | --- |
| app.ready | version |
| plugin.activated / plugin.deactivated | pluginId |
| user.created | user |
| post.created / post.updated | post; update includes result |
| post.beforeDelete / post.deleted | id; deleted includes result |
| page.created / page.updated | page |
| content.created / content.updated | post/type; inspect emitting location |
| archive.beforeQuery / archive.index / archive.search | controller, type or keyword |
| theme.beforeRender / theme.afterRender | controller, name, theme, response, etc. |
| comment.created / comment.updated / comment.deleted | Public comment service and moderation emit different shapes; inspect src/service/comment.js and comment-moderation.js |

| Filter | Input/purpose |
| --- | --- |
| user.beforeCreate | User creation data |
| content.beforeCreate / content.beforeUpdate | Content write data |
| markdown.configure | `markdown-it` parser instance; call `.use()` to install extensions |
| content.markdown | Markdown before rendering |
| content.html | Generated body HTML |
| content.excerpt | Generated excerpt |
| content.render | Body/excerpt HTML, context.type distinguishes content/summary |
| comment.beforeCreate / comment.beforeUpdate / comment.beforeDelete | Strict filters; payloads depend on public-comment versus moderation source |

Notification return values do not replace data. Filters return a replacement; undefined preserves the previous value. Default priority=100, lower runs first. events.on returns an unsubscribe callback. Exceptions are generally logged/isolated; listener failure does not guarantee transaction rollback. Comment before-hooks use filterStrict (failFast) and can reject the operation. For moderation, beforeUpdate receives {id, comment, operation, data} and context.source=moderation; public-comment updates receive data and {ctx}. Do not assume a uniform payload or that returning false vetoes a write.

```js
module.exports = {
  register(ctx) {
    ctx.events.on('post.created', ({post}) => {
      ctx.logger.info(`example: post created ${post.id}`);
    }, {priority: 100});
    ctx.events.on('content.excerpt', (html, context) => {
      return context.post ? html : undefined;
    });
  }
};
```

Enable external messaging/synchronization only when requested. Add timeouts/idempotency; do not recursively create posts in post.created. Comment hooks are available as listed above; Feed and XML-RPC hooks are not established by this API. Verify emission sites rather than inventing events.

## Routes

```js
module.exports = {
  register(ctx) {
    ctx.routes.register({
      method: 'POST', path: '/refresh/:id', auth: 'admin', csrf: true,
      async handler({params, ctx: request}) {
        return {id: params.id, path: request.path};
      }
    });
  }
};
```

Default URL: /api/plugins/example/refresh/<id>. scope=site registers absolute paths and can affect native pages; inspect collisions with core/static/admin routes. Supported methods: GET/HEAD/POST/PUT/PATCH/DELETE/OPTIONS, individually or as an array. Handlers receive ctx/params/query/body/plugin and return response bodies.

Default auth=public and csrf=true. Admin writes should explicitly use auth=admin and csrf=true; send X-CSRF-Token from window.SysConfig.csrfToken. Public webhooks need signature/replay/permission checks; csrf=false alone is not sufficient.

Current src/config/middleware.js runs payload before pluginRoutes and router after it. The plugin middleware passes parsed body (unwrapping body.post when present), or {}. Validate the actual content type/shape and impose suitable limits; do not reread an already consumed stream. For signature verification requiring raw bytes, verify raw-body availability in the target payload adapter before implementing it. Duplicate registrations fail; test dynamic-route ordering and site-scope collisions too.

## Template functions, filters, slots

```js
module.exports = {
  register(ctx) {
    ctx.templates.registerFunction('example.badge', ({count}) => `${Number(count) || 0} views`);
    ctx.templates.registerFilter('example.compact', value => String(Number(value) || 0));
    ctx.templates.registerSlot('post.after', () => '<aside>Recommended reading</aside>');
  }
};
```

```eta
<%= await firekylin.plugin.example.badge({count: 5}) %>
<%= await firekylin.filters['example.compact'](5) %>
<%~ await firekylin.slots.render('post.after') %>
```

The configured Eta varName is `firekylin`; access extensions through `firekylin.plugin`, `firekylin.filters` and `firekylin.slots` (not bare globals). Use exactly two name segments, e.g. example.badge, for template functions: templateContext maps the first two segments to plugin[namespace][function]. Hyphenated IDs require bracket notation. Functions/filters can return Promises; slots appear only when a theme renders them. Resolve awaited values at template top level before using them in synchronous `block(...)` callbacks, or use the verified adapter's `await blockAsync(name, async () => {...})`; `await` inside a synchronous block is invalid. Emit raw slot HTML only when trusted. registerPartial exists in the Registry but the default template context exposes no matching partial invocation interface; do not invent partials.render().

## Admin UI

Use `ctx.admin.registerPanel`, `registerPage`, `registerForm`, `registerAction` in that order as needed. An independent `settings` page (without panel) provides the plugin-management configuration entry; hidden pages can use `menu: false`. Read current `src/plugin/admin.js`, `middleware.js` and `docs/plugins.md` for accepted sections/fields and tests. UI definitions are data, not arbitrary React/script injection. Host endpoints enforce admin identity and CSRF for writes; validate business inputs and persist through verified services. Form load/submit and action handlers receive `{ctx, user, pluginId}`. A form declaration alone does not persist configuration.

## AI tools

Use lowercase segmented names such as example.lookup, not createDraft. Do not claim built-in names or reserved plugin IDs core:content/core:management/core:media.

```js
module.exports = {
  register(ctx) {
    ctx.tools.register({
      name: 'example.lookup', description: 'Return the valid post ID supplied by the caller',
      requiredPermissions: ['posts:read'],
      inputSchema: {type: 'object', additionalProperties: false,
        properties: {id: {type: 'integer', minimum: 1}}, required: ['id']},
      execute(input) {
        if (!input || !Number.isSafeInteger(input.id) || input.id < 1) throw new TypeError('Invalid ID');
        return {id: input.id};
      }
    });
  }
};
```

This demonstrates registration only. Actual queries/commands should reuse PostQueryService/PostCommandService and enforce principal/role/ownership. requiredPermissions is not complete resource-level authorization.

Registry callers supply trusted authorize and, for requiresApproval, approve callbacks. Registry stores schemas; MCP SDK validates remote inputs, so direct internal calls still need validation. OAuth scopes are a fixed allowlist; example:read requires an intentional authorization-server change and tests.

## Verify and deliver

Themes: homepage/detail/pages/search/taxonomy/archives/pagination, 404/500, mobile, resource URLs, comments, private-content exclusion. Plugins: duplicate registration, load failures, cleanup, authentication/CSRF, inputs, event idempotency, external failures.

Use relevant test:widget, test:plugin, test:types and rendering/HTTP checks; build frontend changes. Startup logs/screenshots supplement actual requests. Report files, configuration, invocation, compatibility, and validation.
