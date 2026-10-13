'use strict';

class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  register(definition, owner) {
    if (!owner || typeof owner !== 'string') throw new TypeError('Tool owner required');
    if (!definition || typeof definition !== 'object') throw new TypeError('Tool definition required');
    const {name, description, execute, requiredPermissions = []} = definition;
    if (typeof name !== 'string' || !/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(name)) {
      throw new TypeError('Invalid tool name');
    }
    if (typeof description !== 'string' || !description.trim()) throw new TypeError('Tool description required');
    if (typeof execute !== 'function') throw new TypeError('Tool execute must be a function');
    if (!Array.isArray(requiredPermissions) || requiredPermissions.some(p => typeof p !== 'string' || !p)) {
      throw new TypeError('Invalid requiredPermissions');
    }
    if (this.tools.has(name)) throw new Error('Duplicate tool: ' + name);
    const entry = Object.freeze({
      name, description, inputSchema: definition.inputSchema,
      requiredPermissions: Object.freeze([...new Set(requiredPermissions)]),
      execute, owner
    });
    this.tools.set(name, entry);
    return entry;
  }

  has(name, owner) {
    const tool = this.tools.get(name);
    return !!tool && (owner === undefined || tool.owner === owner);
  }

  list() {
    return [...this.tools.values()].map(({name, description, inputSchema, requiredPermissions}) => ({
      name, description, inputSchema, requiredPermissions: [...requiredPermissions]
    }));
  }

  async execute(name, input, context = {}) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error('Unknown tool: ' + name);
    if (typeof context.authorize !== 'function') throw new Error('Authorization callback required');
    for (const permission of tool.requiredPermissions) {
      if (await context.authorize(permission, {tool: name, owner: tool.owner}) !== true) {
        throw new Error('Permission denied: ' + permission);
      }
    }
    return tool.execute(input, Object.freeze({principal: context.principal, requestId: context.requestId}));
  }

  removePlugin(owner) {
    for (const [name, tool] of this.tools) {
      if (tool.owner === owner) this.tools.delete(name);
    }
  }
}

module.exports = ToolRegistry;
