'use strict';

const crypto = require('crypto');

const KEY_LENGTH = 32;
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => {
    if (character === '&') return '&amp;';
    if (character === '<') return '&lt;';
    if (character === '>') return '&gt;';
    if (character === '"') return '&quot;';
    return '&#39;';
  });
}

module.exports = class extends think.Service {
  hash(password) {
    const salt = crypto.randomBytes(16);
    const derived = crypto.scryptSync(String(password), salt, KEY_LENGTH);
    return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`;
  }

  verify(password, encoded) {
    if (!password || typeof encoded !== 'string') return false;
    const [algorithm, saltValue, hashValue] = encoded.split('$');
    if (algorithm !== 'scrypt' || !saltValue || !hashValue) return false;
    try {
      const expected = Buffer.from(hashValue, 'base64url');
      const actual = crypto.scryptSync(String(password), Buffer.from(saltValue, 'base64url'), expected.length);
      return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    } catch {
      return false;
    }
  }

  cookieName(post) {
    return `fk_post_auth_${post.id}`;
  }

  token(post) {
    return crypto.createHmac('sha256', post.options.postPasswordHash)
      .update(`post:${post.id}`)
      .digest('base64url');
  }

  isUnlocked(ctx, post) {
    if (!post.options || !post.options.postPasswordHash) return true;
    const value = ctx.cookie(this.cookieName(post));
    const expected = this.token(post);
    if (typeof value !== 'string') return false;
    const left = Buffer.from(value);
    const right = Buffer.from(expected);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  }

  unlock(ctx, post, password) {
    if (!this.verify(password, post.options.postPasswordHash)) return false;
    ctx.cookie(this.cookieName(post), this.token(post), {
      httpOnly: true,
      secure: ctx.secure || ctx.protocol === 'https',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE
    });
    return true;
  }

  form(ctx, error = false) {
    const action = escapeHtml(ctx.path || ctx.url);
    return `<form class="post-password-form" method="post" action="${action}">
  <p>${error ? '密码错误，请重新输入。' : '这篇文章受密码保护，请输入密码访问。'}</p>
  <p><input type="password" name="protectPassword" autocomplete="current-password" required> <button type="submit">提交</button></p>
</form>`;
  }
};
