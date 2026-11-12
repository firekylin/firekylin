const {createTranslator} = require('./i18n');
const {loadResources} = require('./i18n-resources');

function themeTranslator(root, id, locale = 'zh-CN') {
  return createTranslator({namespace: `theme:${id}`, locale, resources: loadResources(root).resources});
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
module.exports = {themeTranslator, translateFields};
