'use strict';

const crypto = require('node:crypto');

const CREDENTIALS_KEY = 'ai_credentials';
const PREFERENCES_KEY = 'ai_preferences';

function parse(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value) } catch { return {} }
}

function keyFrom(secret) {
  if (typeof secret !== 'string' || secret.length < 16) {
    throw new Error('AI credential encryption requires FIREKYLIN_AI_CREDENTIAL_KEY or a configured JWT secret');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(value, secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFrom(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return {v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'),
    data: ciphertext.toString('base64')};
}

function decrypt(value, secret) {
  if (!value || value.v !== 1) throw new Error('Unsupported AI credential format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyFrom(secret), Buffer.from(value.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString('utf8');
}

class AIStore {
  constructor({getOptions, updateOptions, encryptionKey}) {
    this.getOptions = getOptions;
    this.updateOptions = updateOptions;
    this.encryptionKey = encryptionKey;
  }

  async secret() {
    const options = await this.getOptions(true);
    return this.encryptionKey || process.env.FIREKYLIN_AI_CREDENTIAL_KEY ||
      options.jwt_secret || options.comment_jwt_secret;
  }

  async getCredential(owner, name) {
    const options = await this.getOptions(true);
    const credentials = parse(options[CREDENTIALS_KEY]);
    const value = credentials[owner] && credentials[owner][name];
    return value ? decrypt(value, await this.secret()) : undefined;
  }

  async hasCredential(owner, name) {
    const options = await this.getOptions(true);
    const credentials = parse(options[CREDENTIALS_KEY]);
    return Boolean(credentials[owner] && credentials[owner][name]);
  }

  async setCredential(owner, name, value) {
    if (typeof value !== 'string' || !value) throw new TypeError('Credential value must be a non-empty string');
    const options = await this.getOptions(true);
    const credentials = parse(options[CREDENTIALS_KEY]);
    credentials[owner] = credentials[owner] || {};
    credentials[owner][name] = encrypt(value, await this.secret());
    await this.updateOptions(CREDENTIALS_KEY, JSON.stringify(credentials));
  }

  async deleteCredential(owner, name) {
    const options = await this.getOptions(true);
    const credentials = parse(options[CREDENTIALS_KEY]);
    if (credentials[owner]) delete credentials[owner][name];
    if (credentials[owner] && !Object.keys(credentials[owner]).length) delete credentials[owner];
    await this.updateOptions(CREDENTIALS_KEY, JSON.stringify(credentials));
  }

  async getPreferences() {
    const options = await this.getOptions(true);
    return parse(options[PREFERENCES_KEY]);
  }

  async setPreferences(value) {
    await this.updateOptions(PREFERENCES_KEY, JSON.stringify(value));
  }
}

module.exports = {AIStore, encrypt, decrypt};
