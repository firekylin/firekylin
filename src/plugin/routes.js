'use strict';

function compilePath(pattern) {
  const names = [];
  const source = pattern.split('/').map(part => {
    let cursor = 0;
    let compiled = '';
    const parameter = /:([a-z_][a-z0-9_]*)/ig;
    let match;
    while ((match = parameter.exec(part))) {
      compiled += part.slice(cursor, match.index).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      names.push(match[1]);
      compiled += '([^/]+)';
      cursor = match.index + match[0].length;
    }
    return compiled + part.slice(cursor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/');
  return {regexp: new RegExp(`^${source}/?$`), names};
}

class RouteRegistry {
  constructor() {
    this.routes = [];
  }

  register(route, pluginId = 'core') {
    if (!route || typeof route !== 'object') throw new TypeError('Plugin route must be an object');
    if (typeof route.path !== 'string' || !route.path.startsWith('/')) {
      throw new TypeError('Plugin route path must start with /');
    }
    if (typeof route.handler !== 'function') throw new TypeError('Plugin route handler must be a function');
    const scope = route.scope || 'plugin';
    if (!['plugin', 'site'].includes(scope)) throw new TypeError(`Unsupported plugin route scope: ${scope}`);
    const methods = Array.isArray(route.method) ? route.method : [route.method || 'GET'];
    const normalized = methods.map(method => String(method).toUpperCase());
    if (normalized.some(method => !['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(method))) {
      throw new TypeError(`Unsupported plugin route method: ${normalized.join(', ')}`);
    }
    const prefix = `/api/plugins/${pluginId}`;
    const path = scope === 'site' || route.path.startsWith(prefix + '/') || route.path === prefix
      ? route.path
      : `${prefix}${route.path}`;
    const collision = this.routes.some(item => item.path === path &&
      item.methods.some(method => normalized.includes(method)));
    if (collision) {
      throw new Error(`Plugin route already registered: ${normalized.join(',')} ${path}`);
    }
    const registration = {
      pluginId,
      scope,
      path,
      methods: normalized,
      handler: route.handler,
      auth: route.auth || 'public',
      csrf: route.csrf !== false,
      ...compilePath(path)
    };
    this.routes.push(registration);
    return () => this.routes.splice(this.routes.indexOf(registration), 1);
  }

  removePlugin(pluginId) {
    this.routes = this.routes.filter(route => route.pluginId !== pluginId);
  }

  match(method, pathname) {
    return this.routes.find(route => route.methods.includes(method.toUpperCase()) && route.regexp.test(pathname));
  }
}

module.exports = RouteRegistry;
