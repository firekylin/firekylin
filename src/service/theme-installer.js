'use strict';

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const JSZip = require('jszip');
const semver = require('semver');

const MAX_ARCHIVE_BYTES = 20 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 2000;

function safeId(value) {
  const id = String(value || '').trim();
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(id)) throw new Error('INVALID_THEME_ID');
  return id;
}

function inside(root, relative) {
  const target = path.resolve(root, relative);
  const relation = path.relative(path.resolve(root), target);
  if (relation === '..' || relation.startsWith(`..${path.sep}`) || path.isAbsolute(relation)) {
    throw new Error('THEME_ARCHIVE_PATH_TRAVERSAL');
  }
  return target;
}

function isSymlink(entry) {
  const permissions = typeof entry.unixPermissions === 'string'
    ? parseInt(entry.unixPermissions, 8) : entry.unixPermissions;
  return Number.isInteger(permissions) && (permissions & 0o170000) === 0o120000;
}

function assertExtractedSize(entries) {
  const bytes = entries.reduce((total, entry) => {
    const size = entry._data && entry._data.uncompressedSize;
    if (!Number.isSafeInteger(size) || size < 0) throw new Error('UNSAFE_THEME_ARCHIVE');
    return total + size;
  }, 0);
  if (bytes > MAX_EXTRACTED_BYTES) throw new Error('THEME_ARCHIVE_TOO_LARGE');
}

class ThemeInstaller {
  constructor({themesPath, backupPath, firekylinVersion, nodeVersion = process.version,
    readOnly = false, now = () => new Date()}) {
    this.themesPath = path.resolve(themesPath);
    this.backupPath = path.resolve(backupPath);
    this.firekylinVersion = firekylinVersion;
    this.nodeVersion = String(nodeVersion).replace(/^v/, '');
    this.readOnly = readOnly;
    this.now = now;
  }

  assertWritable() {
    if (this.readOnly) throw new Error('PACKAGE_INSTALLATION_READ_ONLY');
  }

  async inspect(buffer) {
    if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > MAX_ARCHIVE_BYTES) {
      throw new Error('INVALID_THEME_ARCHIVE_SIZE');
    }
    const zip = await JSZip.loadAsync(buffer);
    const files = Object.values(zip.files).filter(entry => !entry.dir);
    if (!files.length || files.length > MAX_FILES || files.some(isSymlink)) throw new Error('UNSAFE_THEME_ARCHIVE');
    const manifests = files.filter(entry => /(^|\/)package\.json$/.test(entry.name));
    if (manifests.length !== 1) throw new Error('THEME_ARCHIVE_REQUIRES_ONE_MANIFEST');
    const manifestEntry = manifests[0];
    assertExtractedSize([manifestEntry]);
    const prefix = manifestEntry.name.slice(0, -'package.json'.length);
    let manifest;
    try {
      manifest = JSON.parse(await manifestEntry.async('string'));
    } catch {
      throw new Error('INVALID_THEME_MANIFEST');
    }
    const metadata = manifest.firekylin || {};
    if (metadata.type && metadata.type !== 'theme') throw new Error('PACKAGE_IS_NOT_A_THEME');
    const id = safeId(metadata.id || manifest.id || manifest.name);
    const engines = manifest.engines || {};
    const engine = metadata.engine || engines.firekylin;
    if (engine && (!semver.validRange(engine) || !semver.satisfies(this.firekylinVersion, engine))) {
      throw new Error('INCOMPATIBLE_FIREKYLIN_VERSION');
    }
    if (engines.node && (!semver.validRange(engines.node) || !semver.satisfies(this.nodeVersion, engines.node))) {
      throw new Error('INCOMPATIBLE_NODE_VERSION');
    }
    const entries = files.filter(entry => entry.name.startsWith(prefix));
    assertExtractedSize(entries);
    if (!entries.some(entry => entry.name.slice(prefix.length) === 'index.eta')) {
      throw new Error('THEME_INDEX_TEMPLATE_REQUIRED');
    }
    return {zip, entries, prefix, manifest, id};
  }

  async backups() {
    try {
      return (await fs.readdir(this.backupPath, {withFileTypes: true}))
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort()
        .reverse();
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  backupName(id) {
    const stamp = this.now().toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
    return `${safeId(id)}-${stamp}-${crypto.randomBytes(4).toString('hex')}`;
  }

  async install(buffer, {replace = false} = {}) {
    this.assertWritable();
    const inspected = await this.inspect(buffer);
    await fs.mkdir(this.themesPath, {recursive: true});
    await fs.mkdir(this.backupPath, {recursive: true});
    const staging = await fs.mkdtemp(path.join(this.themesPath, '.install-'));
    const extracted = path.join(staging, inspected.id);
    let bytes = 0;
    let backup;
    try {
      await fs.mkdir(extracted);
      for (const entry of inspected.entries) {
        const relative = entry.name.slice(inspected.prefix.length);
        if (!relative) continue;
        const content = await entry.async('nodebuffer');
        bytes += content.length;
        if (bytes > MAX_EXTRACTED_BYTES) throw new Error('THEME_ARCHIVE_TOO_LARGE');
        const target = inside(extracted, relative);
        await fs.mkdir(path.dirname(target), {recursive: true});
        await fs.writeFile(target, content, {mode: 0o644});
      }
      const destination = inside(this.themesPath, inspected.id);
      try {
        await fs.access(destination);
        if (!replace) throw new Error('THEME_ALREADY_INSTALLED');
        backup = this.backupName(inspected.id);
        await fs.rename(destination, inside(this.backupPath, backup));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      await fs.rename(extracted, destination);
      return {id: inspected.id, version: inspected.manifest.version || '0.0.0', backup};
    } catch (error) {
      if (backup) {
        const destination = inside(this.themesPath, inspected.id);
        try { await fs.rename(inside(this.backupPath, backup), destination) } catch {
          // Preserve the installation error when restoration also fails.
        }
      }
      throw error;
    } finally {
      await fs.rm(staging, {recursive: true, force: true});
    }
  }

  async rollback(name) {
    this.assertWritable();
    const backup = safeId(name);
    const match = /^(.+)-\d{8}T\d{6}Z-[a-f0-9]{8}$/.exec(backup);
    if (!match) throw new Error('INVALID_THEME_BACKUP');
    const id = safeId(match[1]);
    const source = inside(this.backupPath, backup);
    const destination = inside(this.themesPath, id);
    const displaced = this.backupName(id);
    try { await fs.rename(destination, inside(this.backupPath, displaced)) } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    try {
      await fs.rename(source, destination);
      return {id, restored: backup, backup: displaced};
    } catch (error) {
      try { await fs.rename(inside(this.backupPath, displaced), destination) } catch {
        // Preserve the rollback error when restoration also fails.
      }
      throw error;
    }
  }
}

module.exports = {ThemeInstaller, safeId, inside};
