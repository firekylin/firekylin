'use strict';

const crypto = require('crypto');

const KEY_LENGTH = 32;
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const ATTEMPT_WINDOW = 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map();

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

  attemptKey(ctx, post) {
    return `${post.id}:${ctx.ip || 'unknown'}`;
  }

  consumeAttempt(ctx, post) {
    const key = this.attemptKey(ctx, post);
    const now = Date.now();
    const recent = (attempts.get(key) || []).filter(time => now - time < ATTEMPT_WINDOW);
    if (recent.length >= MAX_ATTEMPTS) return false;
    recent.push(now);
    attempts.set(key, recent);
    return true;
  }

  async unlock(ctx, post, password) {
    if (!this.consumeAttempt(ctx, post)) return {unlocked: false, limited: true};
    if (!await this.verify(password, post.options.postPasswordHash)) {
      return {unlocked: false, limited: false};
    }
    attempts.delete(this.attemptKey(ctx, post));
    ctx.cookie(this.cookieName(post), this.token(post), {
      httpOnly: true,
      secure: ctx.secure || ctx.protocol === 'https',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE
    });
    return {unlocked: true, limited: false};
  }

  form(ctx, error = false, limited = false) {
    const action = escapeHtml(ctx.path || ctx.url);
    return `<form class="post-password-form" method="post" action="${action}">
  <p>${limited ? '尝试次数过多，请稍后再试。' : error ? '密码错误，请重新输入。' : '这篇文章受密码保护，请输入密码访问。'}</p>
  <p><input type="password" name="protectPassword" autocomplete="current-password" required> <button type="submit">提交</button></p>
</form>`;
  }
};
