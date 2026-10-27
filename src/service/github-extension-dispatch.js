'use strict';

const crypto = require('crypto');
const semver = require('semver');
const {validatePackage} = require('./plugin-installer');
const {trustedUrl} = require('./extension-registry');

const EVENT_TYPE = 'firekylin-extension-update';
const WORKFLOW_PATH = '.github/workflows/firekylin-extensions.yml';

function validateChange(change) {
  if (!change || typeof change !== 'object' || Array.isArray(change)) throw new Error('INVALID_EXTENSION_CHANGE');
  if (change.operation === 'plugin.install') {
    validatePackage(change.name, change.version);
    return {operation: change.operation, name: change.name, version: change.version};
  }
  if (change.operation === 'plugin.uninstall') {
    validatePackage(change.name, '1.0.0');
    return {operation: change.operation, name: change.name};
  }
  if (change.operation === 'plugin.delete-local') {
    if (typeof change.id !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/i.test(change.id) ||
        typeof change.directory !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/i.test(change.directory)) {
      throw new Error('INVALID_PLUGIN_ID');
    }
    return {operation: change.operation, id: change.id, directory: change.directory};
  }
  if (change.operation === 'theme.install') {
    if (typeof change.name !== 'string' || !change.name || change.name.length > 214 ||
        typeof change.id !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/i.test(change.id) || !semver.valid(change.version) ||
        typeof change.download !== 'string' || !/^sha512-[A-Za-z0-9+/]{86}==$/.test(change.integrity || '')) {
      throw new Error('INVALID_THEME_SELECTION');
    }
    return {operation: change.operation, name: change.name, id: change.id, version: change.version,
      download: trustedUrl(change.download).href, integrity: change.integrity};
  }
  throw new Error('UNSUPPORTED_EXTENSION_CHANGE');
}

class GitHubExtensionDispatch {
  constructor({connection, fetcher = fetch}) {
    this.connection = connection;
    this.fetcher = fetcher;
  }

  async request(path, options = {}) {
    const {repository, token} = this.connection || {};
    if (!repository || !token || !/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repository) || /\s/.test(token)) {
      throw new Error('GITHUB_CONNECTION_REQUIRED');
    }
    return this.fetcher(`https://api.github.com/repos/${repository}/${path}`, {
      ...options, redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: {authorization: `Bearer ${token}`, accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28', 'user-agent': 'Firekylin-Extensions',
        ...(options.body ? {'content-type': 'application/json'} : {})}
    });
  }

  async dispatch(input) {
    const change = validateChange(input);
    const workflow = await this.request(`contents/${WORKFLOW_PATH}`);
    if (!workflow.ok) throw new Error('GITHUB_EXTENSION_WORKFLOW_MISSING');
    const file = await workflow.json();
    if (file.encoding !== 'base64' || typeof file.content !== 'string' || file.content.length > 128 * 1024) {
      throw new Error('GITHUB_EXTENSION_WORKFLOW_INVALID');
    }
    const content = Buffer.from(file.content, 'base64').toString('utf8');
    if (!content.includes(EVENT_TYPE) || !content.includes('github-extension-apply.js')) {
      throw new Error('GITHUB_EXTENSION_WORKFLOW_INVALID');
    }
    const requestId = crypto.randomUUID();
    const response = await this.request('dispatches', {method: 'POST',
      body: JSON.stringify({event_type: EVENT_TYPE, client_payload: {requestId, change}})});
    if (!response.ok) throw new Error('GITHUB_EXTENSION_DISPATCH_FAILED');
    return {requestId, repository: this.connection.repository, status: 'submitted'};
  }
}

module.exports = {GitHubExtensionDispatch, validateChange, EVENT_TYPE, WORKFLOW_PATH};
