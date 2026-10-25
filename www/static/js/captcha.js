/* Shared provider loading for login and Waline. No private credentials belong here. */
const loads = new Map();
function load(url) {
  if (!loads.has(url)) loads.set(url, new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => { loads.delete(url); script.remove(); reject(new Error('验证码加载失败，请刷新重试')); };
    document.head.appendChild(script);
  }));
  return loads.get(url);
}
export async function provider(config) {
  if (config.provider === 'turnstile') {
    await load('https://challenges.cloudflare.com/turnstile/v0/api.js');
    return window.turnstile;
  }
  const language = config.language === 'auto' ? '' : `&hl=${encodeURIComponent(config.language)}`;
  await load(`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(config.siteKey)}${language}`);
  await new Promise(resolve => window.grecaptcha.ready(resolve));
  return window.grecaptcha;
}
export async function mount(config, container, onChange) {
  const api = await provider(config);
  if (!container.isConnected) return {getToken: async() => '', reset() {}, destroy() {}};
  if (config.provider === 'recaptcha') {
    return {getToken: () => api.execute(config.siteKey, {action: 'login'}), reset() {}, destroy() {}};
  }
  let token = '';
  const clear = () => { token = ''; onChange(false); };
  const id = api.render(container, {
    sitekey: config.siteKey, theme: config.theme || 'auto', language: config.language || 'auto',
    action: 'login', callback: value => { token = value; onChange(true); },
    'expired-callback': clear, 'error-callback': clear
  });
  return {getToken: async() => token, reset() { clear(); api.reset(id); }, destroy() { api.remove(id); }};
}
export async function prepareWaline(config, container) {
  if (config.provider !== 'turnstile') { await provider(config); return; }
  const api = await provider(config);
  const render = api.render.bind(api);
  let token = '';
  const widget = document.createElement('div');
  widget.setAttribute('aria-label', '评论验证码');
  container.after(widget);
  const pending = () => {token = ''; if (config.hideSubmit) container.classList.add('fk-captcha-pending');};
  pending();
  const id = render(widget, {
    sitekey: config.siteKey, action: 'social', theme: config.theme, language: config.language,
    callback: value => {token = value; container.classList.remove('fk-captcha-pending');},
    'expired-callback': pending, 'error-callback': pending
  });
  api.render = (target, options) => {
    if (options.sitekey !== config.siteKey || target !== '.wl-captcha-container') return render(target, options);
    if (token) {
      const value = token;
      pending();
      options.callback?.(value);
      api.reset(id);
      return id;
    }
    return render(target, {...options, theme: config.theme, language: config.language});
  };
}
