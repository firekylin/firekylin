'use strict';

const FEATURES_KEY = 'ai_content_features';
const DEFAULTS = Object.freeze({title: true, summary: true, rewrite: true, translate: true,
  image: false, slug: false, category: false, autocomplete: false, commentModeration: false, commentReply: false});
function normalizeFeatures(raw) {
  let settings = {};
  try { settings = typeof raw === 'string' ? JSON.parse(raw) : raw || {} } catch { /* Use defaults. */ }
  return Object.fromEntries(Object.entries(DEFAULTS).map(([key, fallback]) =>
    [key, typeof settings?.[key] === 'boolean' ? settings[key] : fallback]));
}
async function editorFeatures(manager, optionsModel) {
  const options = optionsModel ? await optionsModel.getOptions() : {};
  if (Object.hasOwn(options, FEATURES_KEY)) return normalizeFeatures(options[FEATURES_KEY]);
  // Old plugin settings remain readable even after its package is removed or disabled.
  const legacy = await manager?.aiStore?.getCredential('ai-content', 'settings');
  const features = normalizeFeatures(legacy);
  if (legacy && optionsModel?.ensureOption) {
    // Insert only: a concurrent save or another worker's migration always wins.
    return normalizeFeatures(await optionsModel.ensureOption(FEATURES_KEY, JSON.stringify(features)));
  }
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
module.exports = {FEATURES_KEY, DEFAULTS, normalizeFeatures, editorFeatures, featureFor, normalizeSlug, uniqueSlug};
