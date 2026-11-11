const fs = require('node:fs');
const path = require('node:path');
const {createTranslator, createSnapshot} = require('./index');
const {loadResources} = require('./resources');

function themeTranslator(root, id, snapshot = createSnapshot()) {
  return createTranslator({namespace: `theme:${id}`, snapshot, resources: loadResources(root).resources});
}

// Be conservative: any existing t identifier inside template code disables the
// short alias for the entire theme, including includes and layouts.
function supportsAlias(root) {
  const base = fs.realpathSync(root);
  let count = 0;
  function scan(directory) {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      if (++count > 1000 || entry.isSymbolicLink()) return false;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory() && !scan(file)) return false;
      if (entry.isFile() && entry.name.endsWith('.eta')) {
        const source = fs.readFileSync(file, 'utf8');
        for (const code of source.match(/<%[\s\S]*?%>/g) || []) {
          if (/\bt\b/.test(code.replace(/firekylin\.t\b/g, ''))) return false;
        }
      }
    }
    return true;
  }
  return scan(base);
}

function translateFields(fields, t) {
  if (!Array.isArray(fields)) return fields;
  return fields.map(field => {
    if (!field || typeof field !== 'object' || Array.isArray(field)) return field;
    const copy = {...field};
    for (const key of ['label', 'help', 'description', 'placeholder']) {
      if (typeof copy[key] === 'string') copy[key] = t(copy[key]);
    }
    if (Array.isArray(copy.options)) {
      copy.options = copy.options.map(option => {
        if (typeof option === 'string') return {value: option, label: t(option)};
        if (option && typeof option === 'object' && typeof option.label === 'string') {
          return {...option, label: t(option.label)};
        }
        return option;
      });
    }
    return copy;
  });
}
module.exports = {themeTranslator, supportsAlias, translateFields};
