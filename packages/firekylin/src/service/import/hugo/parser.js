const path = require('path');
const yaml = require('js-yaml');

function parseTomlValue(value) {
  value = value.trim();
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map(parseTomlValue)
      .filter(item => item !== '');
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
    return value.slice(1, -1);
  }
  if (/^(true|false)$/i.test(value)) {
    return value.toLowerCase() === 'true';
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  return value;
}

function parseToml(source) {
  const result = {};
  source.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (match && !match[1].startsWith('#')) {
      result[match[1]] = parseTomlValue(match[2]);
    }
  });
  return result;
}

function parseFrontMatter(source) {
  const match = source.match(/^\s*(---|\+\+\+)\s*\r?\n([\s\S]*?)\r?\n\1\s*(?:\r?\n|$)/);
  if (match) {
    return {
      attributes: match[1] === '---' ? (yaml.load(match[2]) || {}) : parseToml(match[2]),
      body: source.slice(match[0].length)
    };
  }

  if (source.trimStart().startsWith('{')) {
    const start = source.indexOf('{');
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < source.length; index++) {
      const char = source[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
      } else if (char === '"') inString = true;
      else if (char === '{') depth++;
      else if (char === '}' && --depth === 0) {
        try {
          return {attributes: JSON.parse(source.slice(start, index + 1)), body: source.slice(index + 1).replace(/^\s+/, '')};
        } catch (e) {
          break;
        }
      }
    }
  }

  return {attributes: {}, body: source};
}

function arrayValue(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}

function imageValue(value) {
  if (Array.isArray(value)) return imageValue(value[0]);
  if (value && typeof value === 'object') {
    return imageValue(value.image || value.src || value.url);
  }
  return typeof value === 'string' ? value : '';
}

function fileSlug(filename) {
  const normalized = filename.replace(/\\/g, '/');
  const basename = path.posix.basename(normalized, path.posix.extname(normalized));
  return basename === 'index' || basename === '_index'
    ? path.posix.basename(path.posix.dirname(normalized))
    : basename;
}

function isPost(filename) {
  const normalized = filename.replace(/\\/g, '/');
  const contentPath = normalized.match(/(?:^|\/)content\/(.*)$/i);
  const relative = contentPath ? contentPath[1] : normalized;
  return /^(posts?)\//i.test(relative.replace(/^\/+/, ''));
}

function normalizeEntry(filename, source, modifiedAt = new Date()) {
  const {attributes, body} = parseFrontMatter(source);
  const params = attributes.params || {};
  const taxonomies = attributes.taxonomies || {};
  const title = attributes.title || fileSlug(filename);
  const slug = attributes.slug || attributes.url || fileSlug(filename);
  const date = attributes.date || attributes.publishDate || modifiedAt;
  const updated = attributes.lastmod || attributes.lastMod || attributes.updated || date;
  const featuredImage = attributes.featuredImage || attributes.featured_image || attributes.cover ||
    attributes.image || attributes.images || params.featuredImage || params.featured_image || params.cover ||
    params.image || params.images;
  const categories = attributes.categories || attributes.category || taxonomies.categories || taxonomies.category;
  const tags = attributes.tags || attributes.tag || taxonomies.tags || taxonomies.tag;

  return {
    title: String(title),
    pathname: String(slug).replace(/^\/+|\/+$/g, '') || fileSlug(filename),
    markdown_content: body,
    created_at: date,
    updated_at: updated,
    draft: attributes.draft === true,
    allow_comment: attributes.comments === false ? 0 : 1,
    is_public: attributes.private === true ? 0 : 1,
    featured_image: imageValue(featuredImage),
    categories: arrayValue(categories),
    tags: arrayValue(tags),
    page: attributes.type === 'page' || attributes.layout === 'page' || !isPost(filename)
  };
}

module.exports = {normalizeEntry, parseFrontMatter, parseToml};
