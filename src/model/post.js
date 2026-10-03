const { Marked } = require('marked');
const { markedHighlight } = require('marked-highlight');
const markedFootnote = require('marked-footnote');
const markedAlert = require('marked-alert');
const hljs = require('highlight.js');
const markedMathjaxExtension = require('../service/marked-mathjax-extension');
const markedTocExtension = require('../service/marked-toc-extension');
const markedImgonlyExtension = require('../service/marked-imgonly-extension');
const markedMermaidExtension = require('../service/marked-mermaid-extension');
const Base = require('./base');

module.exports = class extends Base {
  get relation() {
    return {
      tag: think.Model.MANY_TO_MANY,
      cate: think.Model.MANY_TO_MANY,
      user: {
        type: think.Model.BELONG_TO,
        // fKey: 'user_id',
        // key: 'display_name',
        field: 'id,name,display_name'
      }
    };
  }

  /**
   * 添加文章
   * @param {[type]} data [description]
   * @param {[type]} ip   [description]
   */
  addPost(data) {
    const create_time = think.datetime();
    data = Object.assign({
      type: 0,
      status: 0,
      create_time,
      update_time: create_time,
      is_public: 1
    }, data);

    return this.where({ pathname: data.pathname }).thenAdd(data);
  }

  async savePost(data) {
    const info = await this.where({ id: data.id }).find();
    if (think.isEmpty(info)) {
      return Promise.reject(new Error('POST_NOT_EXIST'));
    }

    // ThinkJS 的 MANY_TO_MANY 关联处理器会跳过空数组（isEmpty([]) === true），
    // 导致无法清除已有的分类和标签关联。这里手动删除空数组对应的关联记录。
    if (Array.isArray(data.cate) && data.cate.length === 0) {
      await this.model('post_cate').where({ post_id: data.id }).delete();
      delete data.cate;
    }
    if (Array.isArray(data.tag) && data.tag.length === 0) {
      await this.model('post_tag').where({ post_id: data.id }).delete();
      delete data.tag;
    }

    data.update_time = think.datetime();
    return this.where({ id: data.id }).update(data);
  }

  async deletePost(post_id) {
    // await this.model('post_cate').delete({post_id});
    // await this.model('post_tag').delete({post_id});
    return this.where({ id: post_id }).delete();
  }

  /**
   * get count posts
   * @param  {Number} userId []
   * @return {Promise}        []
   */
  getCount(userId) {
    if (userId) {
      return this.where({ user_id: userId }).count();
    }
    return this.count();
  }
  /**
   * get latest posts
   * @param  {Number} nums []
   * @return {}      []
   */
  getLatest(user_id, nums = 10) {
    const where = {
      create_time: { '<=': think.datetime() },
      is_public: 1, // 公开
      type: 0, // 文章
      status: 3 // 已经发布
    };
    if (user_id) { where.user_id = user_id }
    return this.order('id DESC')
      .where(where)
      .limit(nums)
      .setRelation(false)
      .order('create_time DESC')
      .select();
  }

  async afterUpdate(data, options) {
    await super.afterUpdate(data, options);
    return this.clearCache();
  }

  async afterDelete(data, options) {
    await super.afterDelete(data, options);
    return this.clearCache();
  }

  async afterAdd(data, options) {
    await super.afterAdd(data, options);
    return this.clearCache();
  }

  async clearCache() {
    think.logger.debug('clear cache');
    await think.cache('post_1', null);
    await think.cache('lastPostList', null);
  }

  /**
   * 更新所有文章的摘要信息并重新保存到数据库
   *
   * @returns {Promise.<void>}
   */
  async updateAllPostSummaries() {
    // get all posts' id and mark down content
    const posts = await this.field('id, markdown_content').setRelation(false).select();
    const allPromises = [];

    if (posts.length > 0) {
      for (let i = 0; i < posts.length; i++) {
        const item = posts[i];
        const summary = await this.getSummary(item.markdown_content);

        allPromises.push(this.where({ id: item.id }).update({ summary }));
      }

      await Promise.all(allPromises);
    }
  }

  /**
   * 渲染 markdown
   * 摘要为部分内容时不展示 TOC
   * 文章正文设置为手动指定 TOC 时不显示
   * 页面不自动生成 TOC 除非是手动指定了
   */
  async getContentAndSummary(data) {
    const options = await this.model('options').getOptions();
    const postTocManual = options.postTocManual === '1';
    const auto_summary = parseInt(options.auto_summary);

    let showToc;
    if (postTocManual) {
      showToc = /(?:^|[\r\n]+)\s*<!--toc-->\s*[\r\n]+/i.test(data.markdown_content);
    } else {
      showToc = data.type / 1 === 0 || /(?:^|[\r\n]+)\s*<!--toc-->\s*[\r\n]+/i.test(data.markdown_content);
    }
    data.content = await this.markdownToHtml(data.markdown_content, { toc: showToc, highlight: true });
    data.summary = await this.getSummary(data.markdown_content, auto_summary);

    return data;
  }

  /**
   * 渲染 markdown 并返回摘要内容
   * 区别于 getContentAndSummary 方法，此方法只处理和返回摘要
   *
   * @param markdown_content MarkDown 内容
   * @param summary_length 摘要长度（可为空）
   * @return {string}
   */
  async getSummary(markdown_content, summary_length) {
    let summary;

    if (!summary_length) {
      const options = await this.model('options').getOptions();
      summary_length = parseInt(options.auto_summary);
    }

    const hasMoreTag = /(?:^|[\r\n]+)\s*<!--more-->\s*[\r\n]+/i.test(markdown_content);

    if (hasMoreTag || summary_length === 0) {
      summary = markdown_content.split('<!--more-->')[0];
      summary = await this.markdownToHtml(summary, { toc: false, highlight: true });
      summary.replace(/<[>]*>/g, '');
    } else {
      summary = await this.markdownToHtml(markdown_content, { toc: false, highlight: true });
      // 过滤掉 HTML 标签 及换行等 并截取所需的长度
      // 增加过滤 svg 内容
      summary = summary
        .replace(/[\n\r\t]/g, '')
        .replace(/<svg[ >].*?<\/svg>/g, '')
        .replace(/<\/?[^>]*>/g, '')
        .substr(0, summary_length) + '...';
    }

    return summary;
  }

  /**
   * markdown to html
   * @return {string}
   */
  async markdownToHtml(content, option = { toc: true, highlight: true }) {
    const extensions = [];
    // 增加 footnote 支持
    extensions.push(markedFootnote());
    // 增加 alert 支持
    extensions.push(markedAlert());
    // 增加 highlight 支持
    if (option.highlight) {
      let detectedLang = null;
      // 自定义钩子：将检测到的语言写入 token（walker 链中最后执行）
      extensions.push({
        walkTokens(token) {
          if (token.type === 'code' && !token.lang && detectedLang) {
            token.lang = detectedLang;
          }
          detectedLang = null;
        }
      });
      // marked-highlight：高亮并存储检测到的语言（walker 链中第二个执行）
      extensions.push(markedHighlight({
        emptyLangClass: 'hljs',
        langPrefix: 'hljs lang-',
        highlight(code, lang) {
          const result = hljs.highlightAuto(code, lang ? [lang] : undefined);
          detectedLang = result.language;
          return result.value;
        }
      }));
    }
    // MathJax extension（walker 链中最先执行）
    extensions.push(markedMathjaxExtension());
    // TOC + heading anchor extension（仅定义 renderer，不参与 walker 链）
    const tocEntries = [];
    if (option.toc) {
      extensions.push(markedTocExtension({
        generateTocName: this.generateTocName.bind(this),
        tocEntries
      }));
    }
    // 纯图片段落标记：在渲染阶段为仅含图片的段落添加class
    extensions.push(markedImgonlyExtension());
    // mermaid代码块改写，便于前端渲染
    extensions.push(markedMermaidExtension());

    // markdown渲染
    const marked = new Marked(...extensions);
    let markedContent = await marked.parse(content);

    // TOC后处理，把TOC加到渲染后的HTML开头
    if (option.toc && tocEntries.length > 0) {
      const tocHtml = this.buildTocHtml(tocEntries);
      markedContent = `<div class="toc">${tocHtml}</div>${markedContent}`;
    }

    return markedContent;
  }

  /**
   * 获取文章创建时间
   *
   * @param data
   * @returns {*}
   */
  getPostTime(data) {
    data.update_time = think.datetime();
    if (!data.create_time) {
      data.create_time = data.update_time;
    } else {
      data.create_time = think.datetime(data.create_time);
    }
    return data;
  }

  /**
   * generate toc name
   * @param  {String} name []
   * @return {String}      []
   */
  generateTocName(name) {
    name = name.trim()
      .replace(/\s+/g, '')
      .replace(/\)/g, '')
      .replace(/[(,]/g, '-')
      .toLowerCase();
    if (/^[\w-]+$/.test(name)) {
      return name;
    }
    return `toc-${think.md5(name).slice(0, 3)}`;
  }

  /**
   * 从 tocEntries 生成嵌套 ul>li 目录 HTML
   * @param  {Array} entries [{id, content, level}]
   * @return {string}
   */
  buildTocHtml(entries) {
    if (!entries.length) return '';
    const minLevel = Math.min(...entries.map(e => e.level));
    let html = '<ul>';
    let currentLevel = minLevel;
    for (const entry of entries) {
      while (currentLevel < entry.level) {
        html += '<ul>';
        currentLevel++;
      }
      while (currentLevel > entry.level) {
        html += '</ul>';
        currentLevel--;
      }
      html += `<li><a href="#${entry.id}">${entry.content}</a></li>`;
    }
    while (currentLevel > minLevel) {
      html += '</ul>';
      currentLevel--;
    }
    html += '</ul>';
    return html;
  }

  async getFeedFullText() {
    const {feedFullText} = await this.model('options').getOptions();
    return feedFullText;
  }

  async getPostsListSize() {
    const {postsListSize} = await this.model('options').getOptions();
    return +postsListSize;
  }

  /**
   * get where condition
   * @param  {[type]} where [description]
   * @return {[type]}       [description]
   */
  getWhereCondition(where) {
    where = think.extend({}, where, {
      is_public: 1, // 公开
      type: 0, // 文章
      status: 3 // 已经发布
    });
    if (!where.create_time) {
      where.create_time = {
        '<=': think.datetime()
      };
    }
    return where;
  }

  /**
   * 获取最近的10条数据 - 有缓存
   *
   * @return {Promise}
   */
  getLastPostList() {
    return think.cache('lastPostList', async() => {
      const postList = await this.getPostList();
      return postList.data;
    });
  }

  /**
   * get post list
   * @param  {[type]} page  [description]
   * @param  {[type]} where [description]
   * @return {[type]}       [description]
   */
  async getPostList(page, options = {}) {
    page = page | 0 || 1;
    const postsListSize = Number(options.pageSize) || await this.getPostsListSize();

    let field = options.field || 'id,title,pathname,create_time,summary,comment_num,options';
    if ((await this.model('user').count()) > 0) { field += ',user_id' }

    if (options.tag || options.cate) {
      const name = options.tag ? 'tag' : 'cate';
      const {id} = await this.model(name)
        .field('id')
        .setRelation(false)
        .where({pathname: options.tag || options.cate})
        .find();
      if (think.isEmpty(id)) {
        return false;
      }
      const where = this.getWhereCondition({[`${name}.${name}_id`]: id});
      return this
        .join({
          table: `post_${name}`,
          as: name,
          on: ['id', 'post_id']
        })
        .where(where)
        .order('create_time DESC')
        .page(page, postsListSize)
        .countSelect();
    }

    const where = this.getWhereCondition(options.where);
    // only cache first page post
    // if(page === 1){
    //   return think.cache('post_1', () => {
    //     return this.field(field)
    //       .page(page, postsListSize)
    //       .setRelation(false)
    //       .order('create_time DESC')
    //       .where(where)
    //       .countSelect();
    //   },{timeout:259200});
    // }

    return this.field(field)
      .page(page, postsListSize)
      .setRelation('user')
      .order('create_time DESC')
      .where(where)
      .countSelect();
  }

  /**
   * get post detail info
   * @param  {[type]} pathname [description]
   * @return {[type]}          [description]
   */
  async getPostDetail(pathname) {
    const where = this.getWhereCondition({pathname});
    const detail = await this.where(where).fieldReverse('markdown_content,summary').find();
    if (think.isEmpty(detail)) {
      return detail;
    }
    const createTime = think.datetime(detail.create_time);
    const prevWhere = this.getWhereCondition({
      create_time: ['<', createTime],
      id: ['!=', detail.id]
    });
    const prevPromise = this.field('title,pathname')
      .setRelation(false)
      .where(prevWhere)
      .order('create_time DESC')
      .find();
    const nextWhere = this.getWhereCondition({
      create_time: ['>', createTime],
      id: ['!=', detail.id]
    });
    const nextPromise = this.field('title,pathname')
      .setRelation(false)
      .where(nextWhere)
      .order('create_time ASC')
      .find();
    const [prev, next] = await Promise.all([prevPromise, nextPromise]);
    detail.prev = prev;
    detail.next = next;
    return detail;
  }
  async getPostRssList() {
    let field = 'id,title,pathname,create_time,';
    const where = this.getWhereCondition();
    const feedFullText = await this.getFeedFullText();

    if (feedFullText === '0') {
      field += 'summary,content';
    } else {
      field += 'content';
    }

    const data = await this.field(field)
      .where(where)
      .order('create_time DESC')
      .setRelation(false)
      .limit(10)
      .select();
    return data;
  }

  async getPostSitemapList() {
    const field = 'pathname,type,update_time';
    const where = {
      is_public: 1, // 公开
      status: 3, // 已经发布
      create_time: {
        '<=': think.datetime()
      }
    };

    const data = await this.field(field)
      .where(where)
      .order('update_time DESC')
      .setRelation(false)
      .select();
    return data;
  }
  /**
   * get post archive
   * @return {[type]} [description]
   */
  async getPostArchive() {
    const where = this.getWhereCondition();
    const data = await this.field('id,title,pathname,create_time,options')
      .order('create_time DESC')
      .setRelation(false)
      .where(where)
      .select();
    const result = {};
    data.forEach(item => {
      const yearMonth = think.datetime(item.create_time, 'YYYY年MM月');
      if (!(yearMonth in result)) {
        result[yearMonth] = [];
      }
      result[yearMonth].push(item);
    });
    return result;
  }
  /**
   * get post search result
   * @param  {[type]} keyword [description]
   * @param  {[type]} page    [description]
   * @return {[type]}         [description]
   */
  async getPostSearch(keyword, page) {
    let where = {'title|content': ['LIKE', `%${keyword}%`]};
    where = this.getWhereCondition(where);
    return this.where(where)
      .page(page, await this.getPostsListSize())
      .setRelation(false)
      .field('title,pathname,summary,create_time,options')
      .order('create_time DESC')
      .countSelect(false);
  }
};
