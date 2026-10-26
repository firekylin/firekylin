'use strict';

function settings(options) {
  if (options.captcha) return typeof options.captcha === 'string' ? JSON.parse(options.captcha) : options.captcha;
  return {provider: 'none', siteKey: '', secret: '', areas: ['login', 'comment']};
}
function enabled(config, area) {
  return ['turnstile', 'recaptcha-v3'].includes(config.provider) && Array.isArray(config.areas) && config.areas.includes(area);
}
function publicSettings(config) {
  const {provider = 'none', siteKey = '', areas = ['login', 'comment'], theme = 'auto', language = 'auto', hideSubmit = false} = config;
  return {provider, siteKey, areas, theme, language, hideSubmit};
}
async function verify(config, token, ip, area, env = process.env) {
  if (!enabled(config, area)) return true;
  const secret = config.secret || (config.provider === 'turnstile' ? env.TURNSTILE_KEY : env.RECAPTCHA_SECRET);
  if (!secret || typeof token !== 'string' || !token || token.length > 8192) return false;
  try {
    const response = await fetch(config.provider === 'turnstile'
      ? 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
      : 'https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST', body: new URLSearchParams({secret, response: token, remoteip: ip || ''}),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.success === true && (config.provider !== 'recaptcha-v3' ||
      (typeof result.score === 'number' && result.score >= 0.5 && result.action === (area === 'comment' ? 'social' : area)));
  } catch { return false }
}
module.exports = {settings, enabled, publicSettings, verify};
