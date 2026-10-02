const Widget = require('../../../common/widget/base');

function truncate(value, length, trim) {
  const characters = Array.from(String(value || ''));
  return length > 0 && characters.length > length
    ? characters.slice(0, length).join('') + trim
    : characters.join('');
}

function stripTags(value) {
  return String(value || '').replace(/<[^>]*>/g, '').trim();
}

module.exports = class ContentsWidget extends Widget {
  push(value) {
    const row = Object.assign({}, value);
    row.pathname = encodeURIComponent(row.pathname || '');
    ['tag', 'cate'].forEach(name => {
      if (Array.isArray(row[name])) {
        row[name] = row[name].map(item => Object.assign({}, item, {
          pathname: encodeURIComponent(item.pathname || '')
        }));
      }
    });
    ['prev', 'next'].forEach(name => {
      if (row[name] && row[name].pathname) {
        row[name] = Object.assign({}, row[name], {pathname: encodeURIComponent(row[name].pathname)});
      }
    });
    if (typeof row.options === 'string') {
      try {
        row.options = JSON.parse(row.options) || {};
      } catch (e) {
        row.options = {};
      }
    }
    row.options = row.options || {};
    row.featuredImage = row.options.featuredImage || '';
    return super.push(row);
  }

  get title() {
    return this.fieldAccessor('title', (value, length = 0, trim = '...') => truncate(value, length, trim));
  }

  get permalink() {
    const type = this.row.type === 1 || this.row.type === 'page' ? 'page' : 'post';
    return `/${type}/${this.row.pathname}.html`;
  }

  get url() {
    return this.permalink;
  }

  date(format) {
    return think.datetime(this.row.create_time, format);
  }

  get content() {
    return this.fieldAccessor('content');
  }

  excerpt(length = 100, trim = '...') {
    return truncate(stripTags(this.row.summary), length, trim);
  }

  commentsNum(...formats) {
    const count = Number(this.row.comment_num) || 0;
    if (!formats.length) formats.push('%d');
    const format = formats[count] || formats[formats.length - 1];
    return String(format).replace(/%d/g, count);
  }

  category(split = ',', link = true, defaultValue = '') {
    return this.formatMetas(this.row.cate, 'cate', split, link, defaultValue);
  }

  tags(split = ',', link = true, defaultValue = '') {
    return this.formatMetas(this.row.tag, 'tag', split, link, defaultValue);
  }

  formatMetas(items, type, split, link, defaultValue) {
    if (!Array.isArray(items) || !items.length) return defaultValue;
    return items.map(item => link
      ? `<a href="/${type}/${item.pathname}">${item.name}</a>`
      : item.name
    ).join(split);
  }

  author(item = 'display_name') {
    if (!this.row.user) return '';
    return this.row.user[item] || this.row.user.name || '';
  }

  allow(...permissions) {
    return permissions.every(permission => {
      const key = `allow_${permission}`;
      return key in this.row ? Boolean(this.row[key]) : false;
    });
  }
};
