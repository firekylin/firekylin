'use strict';

const crypto = require('crypto');
const path = require('path');
const semver = require('semver');
const {validatePackage} = require('./plugin-installer');

class GitHubExtensionDispatch {
  constructor({connection, fetcher = fetch}) { this.connection = connection; this.fetcher = fetcher }

  async request(endpoint, body) {
    const {repository, token} = this.connection || {};
    if (!repository || !token || !/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repository) || /\s/.test(token)) {
      throw new Error('GITHUB_CONNECTION_REQUIRED');
    }
    const response = await this.fetcher(`https://api.github.com/repos/${repository}${endpoint}`, {
      method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: {authorization: `Bearer ${token}`, accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28', 'user-agent': 'Firekylin-Extensions',
        ...(body ? {'content-type': 'application/json'} : {})},
      ...(body ? {body: JSON.stringify(body)} : {})
    });
    if (!response.ok) throw new Error('GITHUB_API_REQUEST_FAILED');
    return response.json();
  }

  async blob(entry) {
    if (!entry || entry.type !== 'blob' || entry.mode !== '100644') throw new Error('GITHUB_INVALID_FILE');
    const blob = await this.request(`/git/blobs/${entry.sha}`);
    if (blob.encoding !== 'base64' || typeof blob.content !== 'string') throw new Error('GITHUB_INVALID_FILE');
    return Buffer.from(blob.content, 'base64');
  }

  async dispatch(change) {
    const operations = ['plugin.install', 'plugin.update', 'plugin.uninstall', 'plugin.delete-local',
      'theme.install', 'theme.update'];
    if (!change || !operations.includes(change.operation)) {
      throw new Error('UNSUPPORTED_EXTENSION_CHANGE');
    }
    if (['plugin.install', 'plugin.update'].includes(change.operation)) validatePackage(change.name, change.version);
    if (change.operation === 'plugin.uninstall') validatePackage(change.name, '1.0.0');
    const repository = await this.request('');
    const branch = repository.default_branch;
    if (!branch || typeof branch !== 'string') throw new Error('GITHUB_DEFAULT_BRANCH_MISSING');
    const ref = await this.request(`/git/ref/heads/${encodeURIComponent(branch)}`);
    const commit = await this.request(`/git/commits/${ref.object.sha}`);
    const tree = await this.request(`/git/trees/${commit.tree.sha}?recursive=1`);
    if (tree.truncated || !Array.isArray(tree.tree)) throw new Error('GITHUB_TREE_TOO_LARGE');
    const files = tree.tree;
    const entries = [];
    if (change.operation.startsWith('plugin.') && change.operation !== 'plugin.delete-local') {
      const lockfiles = ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'pnpm-lock.yml'];
      if (files.some(item => lockfiles.includes(item.path))) {
        throw new Error('GITHUB_LOCKFILE_NOT_SUPPORTED');
      }
      const data = await this.blob(files.find(item => item.path === 'package.json'));
      if (data.length > 1024 * 1024) throw new Error('GITHUB_INVALID_FILE');
      let manifest;
      try { manifest = JSON.parse(data.toString('utf8')) } catch { throw new Error('GITHUB_INVALID_PACKAGE_JSON') }
      if (!manifest || Array.isArray(manifest) || typeof manifest !== 'object') {
        throw new Error('GITHUB_INVALID_PACKAGE_JSON');
      }
      const sections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
      if (sections.some(section => manifest[section] &&
          (typeof manifest[section] !== 'object' || Array.isArray(manifest[section])))) {
        throw new Error('GITHUB_INVALID_PACKAGE_JSON');
      }
      const found = sections.filter(section => Object.hasOwn(manifest[section] || {}, change.name));
      if (change.operation === 'plugin.install') {
        if (found.length) throw new Error('PLUGIN_ALREADY_INSTALLED');
        manifest.dependencies ||= {};
        manifest.dependencies[change.name] = change.version;
      } else {
        if (!found.length) throw new Error('PLUGIN_NOT_FOUND');
        if (change.operation === 'plugin.update') {
          for (const section of found) {
            const current = semver.minVersion(manifest[section][change.name]);
            if (!current || !semver.gt(change.version, current)) throw new Error('PLUGIN_VERSION_NOT_NEWER');
            manifest[section][change.name] = change.version;
          }
        } else {
          for (const section of found) delete manifest[section][change.name];
        }
      }
      const indent = /^([ \t]+)"/m.exec(data.toString('utf8'))?.[1] || '  ';
      entries.push({path: 'package.json', mode: '100644', type: 'blob',
        content: JSON.stringify(manifest, null, indent) + '\n'});
    } else if (change.operation === 'plugin.delete-local') {
      if (![change.id, change.directory].every(value => typeof value === 'string' && /^[a-z0-9][a-z0-9._-]*$/i.test(value))) {
        throw new Error('INVALID_PLUGIN_ID');
      }
      const prefix = `plugins/${change.directory}/`;
      const parent = files.find(item => item.path === 'plugins');
      const folder = files.find(item => item.path === `plugins/${change.directory}`);
      if (parent?.type !== 'tree' || folder?.type !== 'tree') throw new Error('PLUGIN_NOT_FOUND');
      const manifestEntry = files.find(item => item.path === prefix + 'package.json');
      let manifest;
      if (manifestEntry) {
        const content = await this.blob(manifestEntry);
        try { manifest = JSON.parse(content.toString('utf8')) } catch { manifest = null }
      }
      if ((manifest?.firekylin?.id || manifest?.name || change.directory) !== change.id) {
        throw new Error('LOCAL_PLUGIN_ID_MISMATCH');
      }
      for (const item of files.filter(item => item.path.startsWith(prefix) && item.type !== 'tree')) {
        entries.push({path: item.path, mode: item.mode, type: item.type, sha: null});
      }
      if (!entries.length) throw new Error('PLUGIN_NOT_FOUND');
    } else {
      const {inspected} = change;
      if (!inspected || !/^[a-z0-9][a-z0-9._-]*$/i.test(inspected.id)) throw new Error('INVALID_THEME_ID');
      const root = `themes/${inspected.id}`;
      const parent = files.find(item => item.path === 'themes');
      if (parent && parent.type !== 'tree') throw new Error('INVALID_THEMES_DIRECTORY');
      const existing = files.filter(item => item.path === root || item.path.startsWith(root + '/'));
      if (change.operation === 'theme.install' && existing.length) throw new Error('THEME_ALREADY_INSTALLED');
      if (change.operation === 'theme.update') {
        if (existing.find(item => item.path === root)?.type !== 'tree') throw new Error('THEME_NOT_FOUND');
        const manifestBlob = await this.blob(existing.find(item => item.path === root + '/package.json'));
        const current = JSON.parse(manifestBlob.toString('utf8'));
        if (current.name !== inspected.manifest.name ||
            (current.firekylin?.id || current.id || current.name) !== inspected.id || !semver.valid(current.version) ||
            !semver.gt(inspected.manifest.version, current.version)) throw new Error('THEME_VERSION_NOT_NEWER');
      }
      const paths = new Set();
      for (const entry of inspected.entries) {
        const relative = entry.name.slice(inspected.prefix.length);
        if (!relative || relative.includes('\\') || path.posix.isAbsolute(relative) ||
            relative.split('/').some(part => !part || part === '.' || part === '..') || paths.has(relative)) {
          throw new Error('THEME_ARCHIVE_PATH_TRAVERSAL');
        }
        paths.add(relative);
        const content = await entry.async('nodebuffer');
        const blob = await this.request('/git/blobs', {content: content.toString('base64'), encoding: 'base64'});
        entries.push({path: `${root}/${relative}`, mode: '100644', type: 'blob', sha: blob.sha});
      }
      if (change.operation === 'theme.update') {
        const obsolete = existing.filter(item => item.type !== 'tree' && !paths.has(item.path.slice(root.length + 1)));
        for (const item of obsolete) {
          entries.push({path: item.path, mode: item.mode, type: item.type, sha: null});
        }
      }
    }
    const updated = await this.request('/git/trees', {base_tree: commit.tree.sha, tree: entries});
    const newCommit = await this.request('/git/commits', {message: 'Update Firekylin extension', tree: updated.sha,
      parents: [ref.object.sha]});
    const head = `firekylin/extension-${crypto.randomUUID()}`;
    await this.request('/git/refs', {ref: `refs/heads/${head}`, sha: newCommit.sha});
    const pr = await this.request('/pulls', {title: 'Update Firekylin extension', head, base: branch,
      body: 'Review this extension change before merging.'});
    const expected = `https://github.com/${this.connection.repository}/pull/`;
    if (typeof pr.html_url !== 'string' || !pr.html_url.startsWith(expected) || !/^\d+$/.test(pr.html_url.slice(expected.length))) {
      throw new Error('GITHUB_INVALID_PULL_REQUEST');
    }
    return {status: 'created', url: pr.html_url};
  }
}

module.exports = {GitHubExtensionDispatch};
