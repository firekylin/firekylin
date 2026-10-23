'use strict';

const DEFAULTS = {title: true, summary: true, rewrite: true, translate: true,
  slug: false, category: false, autocomplete: false};
async function editorFeatures(manager) {
  const record = manager?.plugins?.get('ai-content');
  if (record?.status !== 'active' || !manager.aiStore) return {...DEFAULTS};
  const raw = await manager.aiStore.getCredential('ai-content', 'settings');
  let settings = {};
  try { settings = typeof raw === 'string' ? JSON.parse(raw) : raw || {} } catch { /* Use defaults. */ }
  const features = Object.fromEntries(Object.entries(DEFAULTS).map(([key, fallback]) =>
    [key, typeof settings[key] === 'boolean' ? settings[key] : fallback]));
  return features;
}
function featureFor(operation) {
  return ({review: 'rewrite', tags: 'category', complete: 'autocomplete'})[operation] || operation;
}
function normalizeSlug(value) {
  const slug = String(value).trim().toLowerCase()
    .replace(/[`"']/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
    .replace(/-$/, '');
  if (!slug) throw new Error('AI 未生成有效的 Slug，请重新生成');
  return slug;
}
async function uniqueSlug(value, find) {
  const base = normalizeSlug(value);
  for (let suffix = 1; suffix <= 1000; suffix++) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    if (!await find(candidate)) return candidate;
  }
  throw new Error('无法生成唯一 Slug，请调整后重试');
}
module.exports = {editorFeatures, featureFor, normalizeSlug, uniqueSlug};
