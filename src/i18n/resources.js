const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {validateDictionary, createTranslator, createSnapshot} = require('./index');

function parseDictionary(source) {
  const parsed = JSON.parse(source);
  validateDictionary(parsed);
  const tokens = source.match(/"(?:[^"\\]|\\.)*"/g) || [];
  const keys = new Set();
  for (let index = 0; index < tokens.length; index += 2) {
    const key = JSON.parse(tokens[index]);
    if (keys.has(key)) throw new TypeError('Duplicate translation key');
    keys.add(key);
  }
  return validateDictionary(parsed);
}

function loadResources(root) {
  const base = fs.realpathSync(root);
  const directory = path.join(base, 'locales');
  if (!fs.existsSync(directory)) return Object.freeze({resources: {}, version: 'empty'});
  const realDirectory = fs.realpathSync(directory);
  if (!realDirectory.startsWith(base + path.sep)) throw new Error('Invalid locale directory');
  const resources = Object.create(null);
  const hash = createHash('sha256');
  const entries = fs.readdirSync(directory).filter(name => name.endsWith('.json')).sort();
  if (entries.length > 100) throw new Error('Too many locale resources');
  for (const name of entries) {
    const locale = name.slice(0, -5);
    if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale)) throw new Error('Invalid resource locale');
    const file = fs.realpathSync(path.join(directory, name));
    if (!file.startsWith(realDirectory + path.sep)) throw new Error('Invalid locale resource path');
    if (fs.statSync(file).size > 256 * 1024) throw new Error('Locale resource too large');
    const source = fs.readFileSync(file, 'utf8');
    resources[locale] = parseDictionary(source);
    hash.update(name).update(source);
  }
  return Object.freeze({resources: Object.freeze(resources), version: hash.digest('hex')});
}

const core = loadResources(path.join(__dirname, '..'));
function coreTranslator(snapshot = createSnapshot()) {
  return createTranslator({namespace: 'core', snapshot, resources: core.resources});
}
module.exports = {parseDictionary, loadResources, core, coreTranslator};
