'use strict';

const DEFAULT_PLUGIN_REGISTRY = 'https://raw.githubusercontent.com/firekylin/plugins/main/registry.json';
const DEFAULT_THEME_REGISTRY = 'https://raw.githubusercontent.com/firekylin/themes/main/registry.json';
const SETTINGS_KEY = 'extension_registry_settings';
const MAX_BYTES = 1024 * 1024;

function trustedUrl(value) {
  let url;
  try { url = new URL(value) } catch { throw new Error('INVALID_REGISTRY_URL') }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash ||
      /%2f|%5c/i.test(url.pathname) ||
      !['raw.githubusercontent.com', 'firekylin.lithub.cc'].includes(url.hostname) ||
      (url.hostname === 'raw.githubusercontent.com' && !/^\/firekylin\/(plugins|themes)\//.test(url.pathname)) ||
      (url.hostname === 'firekylin.lithub.cc' && url.pathname !== '/plugins' &&
        !url.pathname.startsWith('/plugins/'))) {
    throw new Error('UNTRUSTED_REGISTRY_URL');
  }
  return url;
}

function normalizeSettings(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_EXTENSION_SETTINGS');
  const pluginRegistry = value.pluginRegistry || DEFAULT_PLUGIN_REGISTRY;
  const themeRegistry = value.themeRegistry || DEFAULT_THEME_REGISTRY;
  if (typeof pluginRegistry !== 'string' || typeof themeRegistry !== 'string') throw new Error('INVALID_REGISTRY_URL');
  return {pluginRegistry: trustedUrl(pluginRegistry).href, themeRegistry: trustedUrl(themeRegistry).href};
}

function readSettings(options) {
  let value;
  try { value = JSON.parse(options[SETTINGS_KEY] || '{}') } catch { throw new Error('INVALID_EXTENSION_SETTINGS') }
  return normalizeSettings(value);
}

function themeReleaseUrl(value) {
  let url;
  try { url = new URL(value) } catch { return null }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password || url.port ||
      url.search || url.hash) return null;
  const match = /^\/firekylin\/themes\/releases\/download\/([^/]+)\/([^/]+)$/.exec(url.pathname);
  if (!match) return null;
  try {
    const tag = decodeURIComponent(match[1]);
    const filename = decodeURIComponent(match[2]);
    if (!/^[a-z0-9][a-z0-9._+-]*$/i.test(tag) || !/^[a-z0-9][a-z0-9._+-]*\.zip$/i.test(filename)) return null;
  } catch { return null }
  return url;
}

function releaseAssetUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'release-assets.githubusercontent.com' ||
      url.username || url.password || url.port || url.hash) throw new Error('UNTRUSTED_REGISTRY_URL');
  return url;
}

async function fetchBuffer(url, {fetcher = fetch, signal = AbortSignal.timeout(10000), maxBytes = MAX_BYTES,
  allowThemeRelease = false} = {}) {
  const release = allowThemeRelease && themeReleaseUrl(url);
  let current = release || trustedUrl(url);
  for (let redirects = 0; redirects < 4; redirects++) {
    const response = await fetcher(current, {redirect: 'manual', signal,
      headers: {'user-agent': 'Firekylin-Extension-Registry/1'}});
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('INVALID_REGISTRY_REDIRECT');
      await response.body?.cancel();
      const next = new URL(location, current).href;
      current = release ? releaseAssetUrl(next) : trustedUrl(next);
      continue;
    }
    if (!response.ok) throw new Error(`REGISTRY_HTTP_${response.status}`);
    const length = Number(response.headers.get('content-length'));
    if (length > maxBytes) { await response.body?.cancel(); throw new Error('REGISTRY_TOO_LARGE') }
    if (!response.body) throw new Error('INVALID_REGISTRY_RESPONSE');
    const chunks = [];
    let size = 0;
    const reader = response.body.getReader();
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.length;
        if (size > maxBytes) { await reader.cancel(); throw new Error('REGISTRY_TOO_LARGE') }
        chunks.push(Buffer.from(value));
      }
    } finally { reader.releaseLock() }
    return Buffer.concat(chunks);
  }
  throw new Error('REGISTRY_TOO_MANY_REDIRECTS');
}

async function fetchRegistry(url, options) {
  const buffer = await fetchBuffer(url, options);
  let registry;
  try { registry = JSON.parse(buffer.toString('utf8')) } catch { throw new Error('INVALID_REGISTRY') }
  if (!registry || registry.schemaVersion !== 1 || !Array.isArray(registry.packages)) {
    throw new Error('INVALID_REGISTRY');
  }
  return registry.packages.filter(item => item && ['plugin', 'theme'].includes(item.type) &&
    typeof item.name === 'string' && typeof item.version === 'string');
}

module.exports = {
  DEFAULT_PLUGIN_REGISTRY, DEFAULT_THEME_REGISTRY, SETTINGS_KEY, MAX_BYTES,
  trustedUrl, normalizeSettings, readSettings, fetchBuffer, fetchRegistry
};
