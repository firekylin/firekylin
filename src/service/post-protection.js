'use strict';

const crypto = require('crypto');

const KEY_LENGTH = 32;

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => {
    if (character === '&') return '&amp;';
    if (character === '<') return '&lt;';
    if (character === '>') return '&gt;';
    if (character === '"') return '&quot;';
    return '&#39;';
  });
}

function scrypt(password, salt, length) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(String(password), salt, length, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

module.exports = class extends think.Service {
  async hash(password) {
    const salt = crypto.randomBytes(16);
    const derived = await scrypt(password, salt, KEY_LENGTH);
    return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`;
  }

  async verify(password, encoded) {
    if (!password || typeof encoded !== 'string') return false;
    const [algorithm, saltValue, hashValue] = encoded.split('$');
    if (algorithm !== 'scrypt' || !saltValue || !hashValue) return false;
    try {
      const expected = Buffer.from(hashValue, 'base64url');
      const actual = await scrypt(password, Buffer.from(saltValue, 'base64url'), expected.length);
      return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    } catch {
      return false;
    }
  }

  unlock(post, password) {
    return this.verify(password, post.options.postPasswordHash);
  }

  form(ctx, error = false) {
    const action = escapeHtml(ctx.state && ctx.state.originalPermalink || ctx.path || ctx.url);
    return `<form class="post-password-form" method="post" action="${action}">
  <p>${error ? '密码错误，请重新输入。' : '这篇文章受密码保护，请输入密码访问。'}</p>
  <p><input type="password" name="protectPassword" autocomplete="current-password" required> <button type="submit">提交</button></p>
</form>`;
  }
};
