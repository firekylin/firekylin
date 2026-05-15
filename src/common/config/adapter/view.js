const path = require('path');
const eta = require('think-view-eta');


/**
 * view adapter config
 * @type {Object}
 */
module.exports = {
  type: 'eta',
  common: {
    viewPath: path.join(think.ROOT_PATH, 'view'),
    sep: '_',
    extname: '.html',
    content_type: 'text/html'
  },
  eta: {
    handle: eta,
    options: {
      useWith: true,
      defaultExtension: '.html'
    },
    beforeRender(etaInstance) {
      etaInstance.configure({
        functionHeader: `
const defaultValue = (value, defaultVal) => (value === undefined || value === null || value === '' ? defaultVal : value);
const utc = time => (new Date(time)).toUTCString();
const buildQuery = obj => '?' + Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])).join('&');
const pagination = (page, pageUrl) => {
  const parsed = require('url').parse(pageUrl, true);
  parsed.query.page = page;
  return parsed.pathname + buildQuery(parsed.query);
};
const xml = str => {
  //eslint-disable-next-line no-control-regex
  const NOT_SAFE_IN_XML = /[^\\x09\\x0A\\x0D\\x20-\\xFF\\x85\\xA0-\\uD7FF\\uE000-\\uFDCF\\uFDE0-\\uFFFD]/gm;
  return String(str || '').replace(NOT_SAFE_IN_XML, '');
};
const urlencode = value => encodeURIComponent(value);
const range = (start, end, step = 1) => {
  const list = [];
  const from = Number(start);
  const to = Number(end);
  if (!Number.isFinite(from) || !Number.isFinite(to) || !Number.isFinite(step) || step === 0) {
    return list;
  }
  if (step > 0) {
    for (let i = from; i < to; i += step) list.push(i);
  } else {
    for (let i = from; i > to; i += step) list.push(i);
  }
  return list;
};
`
      });
    }
  }
};
