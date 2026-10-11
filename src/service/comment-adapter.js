'use strict';
/* eslint-disable max-len */

const FIELD_MAP = {
  objectId: 'id', createdAt: 'created_at', updatedAt: 'updated_at', insertedAt: 'inserted_at'
};

function dbField(field) { return FIELD_MAP[field] || field }
function apiRow(row) {
  if (!row) return row;
  const result = {...row, objectId: String(row.id)};
  if (row.created_at) result.createdAt = row.created_at;
  if (row.updated_at) result.updatedAt = row.updated_at;
  if (row.inserted_at) result.insertedAt = row.inserted_at;
  delete result.created_at; delete result.updated_at; delete result.inserted_at;
  return result;
}
function dbWhere(where = {}) {
  const output = {};
  for (const [key, value] of Object.entries(where)) {
    if (key === '_complex') output._complex = dbWhere(value);
    else if (key === '_logic') output._logic = value;
    else output[dbField(key)] = typeof value === 'undefined' ? null : value;
  }
  return output;
}
function dbData(data) {
  const output = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (typeof value !== 'undefined' && key !== 'objectId') output[dbField(key)] = value;
  }
  return output;
}

class ModelAdapter {
  constructor(model) { this.model = model }
  async select(where = {}, options = {}) {
    let query = this.model.where(dbWhere(where));
    if (options.field) query = query.field(options.field.map(dbField).join(','));
    if (options.order) query = query.order(options.order.map(item => `${dbField(item.field)} ${item.direction.toUpperCase()}`).join(','));
    else if (options.desc) query = query.order(`${dbField(options.desc)} DESC`);
    if (options.limit) query = query.limit(options.offset || 0, options.limit);
    return (await query.select()).map(apiRow);
  }
  async count(where = {}, options = {}) {
    if (!options.group || !options.group.length) return Number(await this.model.where(dbWhere(where)).count());
    const fields = options.group.map(dbField);
    const rows = await this.model.where(dbWhere(where)).field(`${fields.join(',')},COUNT(*) AS count`).group(fields.join(','))
      .select();
    return rows.map(row => ({...row, count: Number(row.count)}));
  }
  async add(data) {
    const now = think.datetime();
    const saved = dbData({createdAt: now, updatedAt: now, ...data});
    const id = await this.model.add(saved);
    return apiRow({...saved, id});
  }
  async update(data, where) {
    const rows = await this.select(where);
    const output = [];
    for (const row of rows) {
      const patch = typeof data === 'function' ? data(row) : data;
      const saved = dbData({...patch, updatedAt: think.datetime()});
      await this.model.where({id: row.objectId}).update(saved);
      output.push(apiRow({...row, ...saved, id: row.objectId}));
    }
    return output;
  }
  async delete(where) { await this.model.where(dbWhere(where)).delete() }
}

class UserAdapter extends ModelAdapter {
  toApi(row) {
    if (!row) return row;
    return {
      objectId: String(row.id),
      id: String(row.id),
      email: row.email,
      display_name: row.display_name || row.name,
      url: row.url,
      avatar: row.avatar,
      password: row.password,
      label: row.comment_label,
      '2fa': row.comment_2fa,
      type: Number(row.status) !== 1 ? 'banned' : Number(row.type) === 1 ? 'administrator' : 'guest',
      createdAt: row.create_time,
      updatedAt: row.last_login_time
    };
  }
  async select(where = {}, options = {}) {
    const mapped = {...where};
    if (mapped.objectId) { mapped.id = mapped.objectId; delete mapped.objectId }
    if (mapped.type) {
      if (mapped.type === 'banned') mapped.status = ['!=', 1];
      delete mapped.type;
    }
    let query = this.model.where(dbWhere(mapped));
    if (options.limit) query = query.limit(options.offset || 0, options.limit);
    if (options.desc) query = query.order(options.desc === 'createdAt' ? 'create_time DESC' : `${dbField(options.desc)} DESC`);
    return (await query.select()).map(row => this.toApi(row));
  }
  count(where = {}) { return this.model.where(dbWhere(where)).count().then(Number) }
  async add(data) {
    const email = data.email;
    const base = String(email).split('@')[0].replace(/[^a-z0-9_-]/ig, '').slice(0, 30) || 'commenter';
    let name = base; let suffix = 0;
    while (await this.model.where({name}).count()) name = `${base}-${++suffix}`;
    const now = think.datetime();
    const id = await this.model.add({name, display_name: data.display_name || name, email, password: data.password || '', type: 4, status: 1, create_time: now, last_login_time: now, create_ip: '', last_login_ip: '', url: data.url || null, avatar: data.avatar || null, comment_label: data.label || null, comment_2fa: data['2fa'] || null});
    return this.toApi(await this.model.where({id}).find());
  }
  async update(data, where) {
    const users = await this.select(where); const output = [];
    for (const user of users) {
      const source = typeof data === 'function' ? data(user) : data;
      const patch = {};
      const map = {display_name: 'display_name', email: 'email', password: 'password', url: 'url', avatar: 'avatar', label: 'comment_label', '2fa': 'comment_2fa'};
      for (const [key, column] of Object.entries(map)) if (typeof source[key] !== 'undefined') patch[column] = source[key];
      if (source.type === 'banned') patch.status = 0;
      else if (source.type) patch.status = 1;
      await this.model.where({id: user.objectId}).update(patch);
      output.push(this.toApi(await this.model.where({id: user.objectId}).find()));
    }
    return output;
  }
  async delete(where) { const users = await this.select(where); if (users.length) await this.model.where({id: ['IN', users.map(user => user.objectId)]}).delete(); }
}

module.exports = {ModelAdapter, UserAdapter, apiRow, dbWhere};
