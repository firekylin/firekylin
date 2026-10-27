'use strict';

const {AIStore} = require('../ai/store');

const OWNER = 'core:extension-github';
const CREDENTIAL = 'repository';

function repositoryName(value) {
  let url;
  try { url = new URL(value) } catch { throw new Error('INVALID_GITHUB_REPOSITORY') }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password || url.port ||
      url.search || url.hash) throw new Error('INVALID_GITHUB_REPOSITORY');
  const match = /^\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/.exec(url.pathname);
  if (!match || match[2] === '.' || match[2] === '..') throw new Error('INVALID_GITHUB_REPOSITORY');
  return `${match[1]}/${match[2]}`;
}

function credentialStore(model) {
  return new AIStore({
    getOptions: privateOptions => model.getOptions(privateOptions),
    getCredentialValue: key => model.getCredentialValue(key),
    setCredentialValue: (key, value) => model.setCredentialValue(key, value),
    deleteCredentialValue: key => model.deleteCredentialValue(key),
    encryptionKey: process.env.FIREKYLIN_EXTENSION_CREDENTIAL_KEY
  });
}

async function inspectRepository(repository, token, fetcher = fetch) {
  if (typeof token !== 'string' || !token || token.length > 4096 || /\s/.test(token)) {
    throw new Error('INVALID_GITHUB_TOKEN');
  }
  const response = await fetcher(`https://api.github.com/repos/${repository}`, {
    headers: {authorization: `Bearer ${token}`, accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28', 'user-agent': 'Firekylin-Extensions'},
    redirect: 'error', signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error('GITHUB_REPOSITORY_ACCESS_FAILED');
  const result = await response.json();
  if (result.full_name?.toLowerCase() !== repository.toLowerCase() || result.permissions?.push !== true ||
      result.archived || result.disabled) throw new Error('GITHUB_REPOSITORY_NOT_WRITABLE');
  return result.full_name;
}

class ExtensionGitHub {
  constructor(model, fetcher = fetch) { this.store = credentialStore(model); this.fetcher = fetcher }

  async connection() {
    const value = await this.store.getCredential(OWNER, CREDENTIAL);
    if (!value) return null;
    const result = JSON.parse(value);
    if (!result || typeof result.repository !== 'string' || typeof result.token !== 'string') {
      throw new Error('INVALID_GITHUB_CONNECTION');
    }
    return result;
  }

  async save(url, token) {
    const repository = repositoryName(url);
    let effectiveToken = token;
    if (!effectiveToken) {
      const previous = await this.connection();
      effectiveToken = previous?.repository.toLowerCase() === repository.toLowerCase() && previous.token;
    }
    const canonical = await inspectRepository(repository, effectiveToken, this.fetcher);
    await this.store.setCredential(OWNER, CREDENTIAL, JSON.stringify({repository: canonical, token: effectiveToken}));
    return {repository: `https://github.com/${canonical}`, connected: true};
  }

  async status() {
    const result = await this.connection();
    return result ? {repository: `https://github.com/${result.repository}`, connected: true} : {connected: false};
  }

  async disconnect() { await this.store.deleteCredential(OWNER, CREDENTIAL) }
}

module.exports = {ExtensionGitHub, repositoryName, inspectRepository};
