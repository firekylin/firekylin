'use strict';

const semver = require('semver');
const {validatePackage} = require('./plugin-installer');

const OPERATIONS = new Set(['plugin.install', 'plugin.uninstall', 'theme.install']);

function validateRepository(value) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(String(value || ''))) {
    throw new Error('INVALID_DEPLOYMENT_REPOSITORY');
  }
  return value;
}

function validateChange(change) {
  if (!change || !OPERATIONS.has(change.operation)) throw new Error('INVALID_PACKAGE_OPERATION');
  if (change.operation === 'plugin.install') validatePackage(change.name, change.version);
  if (change.operation === 'plugin.uninstall') validatePackage(change.name, '0.0.0');
  if (change.operation === 'theme.install') {
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(String(change.id || ''))) throw new Error('INVALID_THEME_ID');
    if (!semver.valid(change.version)) throw new Error('THEME_VERSION_MUST_BE_EXACT');
    const download = new URL(change.download);
    if (download.protocol !== 'https:') throw new Error('THEME_DOWNLOAD_MUST_USE_HTTPS');
    if (!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(String(change.integrity || ''))) {
      throw new Error('THEME_INTEGRITY_REQUIRED');
    }
  }
  return change;
}

class GithubDeploymentAdapter {
  constructor({repository, token, eventType = 'firekylin-package-change', fetcher = global.fetch,
    provider = 'github'} = {}) {
    this.repository = validateRepository(repository);
    if (!token) throw new Error('DEPLOYMENT_TOKEN_REQUIRED');
    if (!/^[a-z0-9][a-z0-9._-]{0,99}$/.test(eventType)) throw new Error('INVALID_DEPLOYMENT_EVENT');
    this.token = token;
    this.eventType = eventType;
    this.fetcher = fetcher;
    this.provider = provider;
  }

  async deploy(change) {
    const payload = validateChange(change);
    const response = await this.fetcher(`https://api.github.com/repos/${this.repository}/dispatches`, {
      method: 'POST', redirect: 'error', headers: {
        accept: 'application/vnd.github+json', authorization: `Bearer ${this.token}`,
        'content-type': 'application/json', 'user-agent': 'Firekylin-Marketplace/1',
        'x-github-api-version': '2022-11-28'
      }, body: JSON.stringify({event_type: this.eventType, client_payload: payload})
    });
    if (!response.ok) throw new Error(`DEPLOYMENT_DISPATCH_${response.status}`);
    return {provider: this.provider, repository: this.repository, operation: payload.operation,
      deploymentRequired: true};
  }
}

function createDeploymentAdapter(config) {
  if (!config) return null;
  if (!['github', 'vercel-git'].includes(config.type)) throw new Error('UNSUPPORTED_DEPLOYMENT_ADAPTER');
  return new GithubDeploymentAdapter({...config, provider: config.type});
}

module.exports = {GithubDeploymentAdapter, createDeploymentAdapter, validateChange, validateRepository};
