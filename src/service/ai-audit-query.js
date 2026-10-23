'use strict';
const STATUSES = ['unfinished', 'success', 'failure', 'timeout', 'cancelled'];
const LIST_FIELDS = ['id', 'request_id', 'correlation_id', 'started_at', 'actor_id', 'actor_name', 'source',
  'plugin_id', 'scenario', 'provider', 'model', 'capability', 'duration_ms', 'status', 'error_category',
  'provider_request_id', 'input_tokens', 'output_tokens', 'total_tokens', 'content_recorded'].join(',');
function invalid() { const error = new Error('Invalid audit filter'); error.status = 400; throw error }
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z)?$/.test(value)) return invalid();
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value.slice(0, 10)) {
    return invalid();
  }
  return timestamp;
}
function filters(input) {
  const where = {};
  for (const key of ['scenario', 'provider', 'model']) {
    if (!input[key]) continue;
    if (typeof input[key] !== 'string' || input[key].length > 256) return invalid();
    where[key] = input[key];
  }
  if (input.status) {
    if (!STATUSES.includes(input.status)) return invalid();
    where.status = input.status;
  }
  if (input.actor_id) {
    if (!/^[1-9]\d*$/.test(String(input.actor_id)) || !Number.isSafeInteger(Number(input.actor_id))) return invalid();
    where.actor_id = Number(input.actor_id);
  }
  if (input.from || input.to) {
    const from = input.from ? date(input.from) : 0;
    const to = input.to ? date(input.to) : 8640000000000000;
    if (to <= from) return invalid();
    where.started_at = ['>=', from];
    where._complex = {started_at: ['<', to]};
  }
  return where;
}
function pagination(input) {
  const page = Number(input.page || 1), size = Number(input.pageSize || 20);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(size) || size < 1 || size > 100) {
    return invalid();
  }
  return {page, size};
}
function cleanup(input) {
  if (Array.isArray(input.ids) && !input.before && input.ids.length > 0 && input.ids.length <= 100 &&
      input.ids.every(id => Number.isSafeInteger(id) && id > 0)) return {id: ['IN', [...new Set(input.ids)]]};
  if (input.before && !input.ids) return {started_at: ['<', date(input.before)]};
  return invalid();
}
async function list(model, input) {
  const where = filters(input);
  const {page, size} = pagination(input);
  const aggregate = `COUNT(*) AS calls,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successes,
    SUM(CASE WHEN status IN ('failure','timeout','cancelled') THEN 1 ELSE 0 END) AS failures,
    SUM(CASE WHEN input_tokens IS NULL OR output_tokens IS NULL OR total_tokens IS NULL THEN 1 ELSE 0 END) AS unknown_usage,
    SUM(input_tokens) AS input_tokens,SUM(output_tokens) AS output_tokens,SUM(total_tokens) AS total_tokens`;
  const [rows, summary] = await Promise.all([
    model().where(where).field(LIST_FIELDS)
      .order('started_at DESC,id DESC')
      .page(page, size)
      .select(),
    model().where(where).field(aggregate)
      .find()
  ]);
  for (const key of Object.keys(summary)) if (summary[key] !== null) summary[key] = Number(summary[key]);
  return {rows, summary, total: summary.calls || 0, page, pageSize: size};
}
module.exports = {STATUSES, LIST_FIELDS, date, filters, pagination, cleanup, list};
