'use strict';

const CLIENT_VERSION = '3.16.0';
const DEFAULT_RESOURCE_URL = `https://cdn.jsdelivr.net/npm/@waline/client@${CLIENT_VERSION}/dist`;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeClassName(value) {
  return String(value || '').split(/\s+/)
    .filter(name => /^[a-z0-9_-]+$/i.test(name))
    .join(' ');
}

function normalizeResourceURL(value) {
  if (typeof value === 'undefined') return DEFAULT_RESOURCE_URL;
  const url = String(value).trim().replace(/\/+$/, '');
  if (!/^(?:https?:)?\/\//i.test(url) && !/^\/(?!\/)/.test(url)) {
    throw new TypeError('comment resourceURL must be an HTTP(S) or root-relative URL');
  }
  return url;
}

module.exports = class extends think.Service {
  render(controller, options = {}) {
    const archive = controller.archive;
    const post = archive && archive.stack && archive.stack[0];
    const cannotComment = !post || !post.allow_comment || Number(post.status) !== 3 ||
      Number(post.is_public) !== 1 || controller.get('preview');
    if (cannotComment) return '';
    if (controller.commentRendered) return '';

    const settings = controller.options.comment || {};
    const resourceURL = normalizeResourceURL(options.resourceURL);
    controller.commentRendered = true;
    const config = {
      serverURL: `${controller.options.siteUrl}/api/comment`,
      pageSize: Number(settings.pageSize) || 10,
      lang: settings.locale || 'zh-CN',
      login: settings.forceLogin ? 'force' : 'enable',
      resources: {
        script: `${resourceURL}/waline.js`,
        style: `${resourceURL}/waline.css`
      }
    };
    const className = ['fk-comments', safeClassName(options.className)].filter(Boolean).join(' ');
    const title = typeof options.title === 'string' ? options.title : 'Comments';
    const loadingText = typeof options.loadingText === 'string' ? options.loadingText : '评论加载中…';
    const titleHtml = title ? `<h1 class="title">${escapeHtml(title)}</h1>` : '';
    const configJson = escapeHtml(JSON.stringify(config));

    return `<section id="comments" class="${className}">${titleHtml}<div class="fk-comment-container" data-comment-config="${configJson}">${escapeHtml(loadingText)}</div><script>(function(c){
var start=function(){if(c.dataset.loaded)return;c.dataset.loaded='1';var o=JSON.parse(c.dataset.commentConfig),resources=o.resources;delete o.resources;o.el=c;o.path=location.pathname;
if(!window.__FK_COMMENT_CLIENT__){window.__FK_COMMENT_CLIENT__=(function(){var l=document.createElement('link');l.rel='stylesheet';l.href=resources.style;document.head.appendChild(l);return import(resources.script)})()}
var session=fetch(o.serverURL+'/api/token',{credentials:'same-origin'}).then(function(r){return r.json()}).then(function(r){return r.errno===0?r.data:null}).catch(function(){return null});
Promise.all([window.__FK_COMMENT_CLIENT__,session]).then(function(r){var u=r[1];if(u&&u.objectId){u.remember=true;localStorage.setItem('WALINE_USER',JSON.stringify(u))}else{localStorage.removeItem('WALINE_USER')}c.textContent='';r[0].init(o)}).catch(function(){c.textContent='评论组件加载失败，请稍后重试。'})};
if('IntersectionObserver'in window){var observer=new IntersectionObserver(function(entries){if(entries[0].isIntersecting){observer.disconnect();start()}},{rootMargin:'1000px'});observer.observe(c)}else{start()}
})(document.currentScript.previousElementSibling)</script></section>`;
  }
};
