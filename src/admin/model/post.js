const marked = require('marked');
const toc = require('markdown-toc');
const highlight = require('highlight.js');
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
    let create_time = think.datetime();
    data = Object.assign({
      type: 0,
      status: 0,
      create_time,
      update_time: create_time,
      is_public: 1
    }, data);

    return this.where({pathname: data.pathname}).thenAdd(data);
  }

  async savePost(data) {
    let info = await this.where({id: data.id}).find();
    if(think.isEmpty(info)) {
      return Promise.reject(new Error('POST_NOT_EXIST'));
    }
    data.update_time = think.datetime();
    return this.where({id: data.id}).update(data);
  }

  async deletePost(post_id) {
    //await this.model('post_cate').delete({post_id});
    //await this.model('post_tag').delete({post_id});
    return this.where({id: post_id}).delete();
  }

  /**
   * get count posts
   * @param  {Number} userId []
   * @return {Promise}        []
   */
  getCount(userId) {
    if(userId) {
      return this.where({user_id: userId}).count();
    }
    return this.count();
  }
  /**
   * get latest posts
   * @param  {Number} nums []
   * @return {}      []
   */
  getLatest(user_id, nums = 10) {
    let where = {
      create_time: {'<=': think.datetime()},
      is_public: 1, //公开
      type: 0, //文章
      status: 3, //已经发布
    };
    if(user_id) { where.user_id = user_id; }
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

  clearCache() {
    think.logger.debug('clear cache');
    return think.cache('post_1', null);
  }


  /**
   * 更新所有文章的摘要信息并重新保存到数据库
   *
   * @returns {Promise.<void>}
   */
  async updateAllPostSummaries () {
    // get all posts' id and mark down content
    const posts = await this.field('id, markdown_content').setRelation(false).select();
    const allPromises = [];

    if (posts.length > 0) {
      for (let i = 0; i < posts.length; i++) {
        const item = posts[i];
        const summary = await this.getSummary(item.markdown_content);

        allPromises.push(this.where({id: item.id}).update({summary}))
      }

      await Promise.all(allPromises)
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
    if(!postTocManual) {
      showToc = data.type/1 === 0;
    } else {
      showToc = /(?:^|[\r\n]+)\s*<!--toc-->\s*[\r\n]+/i.test(data.markdown_content);
    }
    data.content = await this.markdownToHtml(data.markdown_content, {toc: showToc, highlight: true});
    data.summary = await this.getSummary(data.markdown_content, auto_summary)

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
  async getSummary (markdown_content, summary_length) {
    let summary;

    if (! summary_length) {
      const options = await this.model('options').getOptions();
      summary_length = parseInt(options.auto_summary);
    }

    const hasMoreTag = /(?:^|[\r\n]+)\s*<!--more-->\s*[\r\n]+/i.test(markdown_content);

    if (hasMoreTag || summary_length === 0) {
      summary = markdown_content.split('<!--more-->')[0];
      summary = await this.markdownToHtml(summary, {toc: false, highlight: true});
      summary.replace(/<[>]*>/g, '');

    } else {
      summary = await this.markdownToHtml(markdown_content, {toc: false, highlight: true});
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
  async markdownToHtml(content, option = {toc: true, highlight: true}) {

    // 使用包含 MathJax 解析的 Markdown 引擎解析 MD 文本
    let markedWithMathJax = think.service('marked-with-mathjax');
    let markedContent = await markedWithMathJax.render(content);

    /**
     * 增加 TOC 目录
     */
    if(option.toc) {
      let tocContent = marked(toc(content).content).replace(/<a\s+href="#([^"]+)">([^<>]+)<\/a>/g, (a, b, c) => {
        return `<a href="#${this.generateTocName(c)}">${c}</a>`;
      });

      markedContent = markedContent.replace(/<h(\d)[^<>]*>(.*?)<\/h\1>/g, (a, b, c) => {
        return `<h${b}><a id="${this.generateTocName(c)}" class="anchor" href="#${this.generateTocName(c)}"></a>${c}</h${b}>`;
      });
      markedContent = `<div class="toc">${tocContent}</div>${markedContent}`;
    }

    /**
     * 增加代码高亮
     */
    if(option.highlight) {
      markedContent = markedContent.replace(/<pre><code\s*(?:class="lang-(\w+)")?>([\s\S]+?)<\/code><\/pre>/mg, (a, language, text) => {
        text = text.replace(/&#39;/g, '\'')
          .replace(/&gt;/g, '>')
          .replace(/&lt;/g, '<')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&');
        var result = highlight.highlightAuto(text, language ? [language] : undefined);
        return `<pre><code class="hljs lang-${result.language}">${result.value}</code></pre>`;
      });
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
    if(!data.create_time) {
      data.create_time = data.update_time;
    }else{
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
    if(/^[\w-]+$/.test(name)) {
      return name;
    }
    return `toc-${think.md5(name).slice(0, 3)}`;
  }
}
