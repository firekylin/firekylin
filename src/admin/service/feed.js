const {parse} = require('url');
const FeedParser = require('feedparser');
const request = require('request');
const req = require('request-promise-native');

const API_URL = 'https://firekylin.org/api/spider';
module.exports = class extends think.Service {
  constructor(options) {
    super(options);

    this.options = options;
  }

  /**
   * 获取文章 Markdown 正文
   * @param {String} url 文章URL
   */
  async contentParser(url) {
    const resp = await req({
      uri: API_URL,
      method: 'GET',
      qs: {url},
      json: true
    });

    if(resp.errno) {
      return false;
    }
    return resp.data;
  }

  /**
   * 获取文章的地址，解析失败则返回当前内容md5作为标志
   * @param {String} url 文章URL
   * @param {String} description 文章简介
   */
  pathnamePaser(url, description) {
    url = parse(url);
    const guid = think.md5(description);
    if(!url) {
      return guid;
    }

    const pathname = url.pathname.replace(/\/+$/, '').split('/').pop();
    if(!pathname) {
      return guid;
    }

    const ret = pathname.replace(/\..+$/, '');
    if(!ret) {
      return guid;
    }

    return ret;
  }

  /**
   * 根据 feed 数据获取文章数据
   * @param {Object} feed 解析出来的 feed 数据
   */
  async transformPost({title, link, pubDate, description}) {
    let {
      content: markdown_content,
      firstImageUrl: featuredImage
    } = await this.contentParser(link);

    if(!markdown_content) {
      markdown_content = description;
    }

    return {
      title,
      markdown_content,
      create_time: pubDate,
      pathname: this.pathnamePaser(link, description),
      options: !featuredImage ? { } : { featuredImage }
    };
  }

  /**
   * 解析 RSS 地址获取更新文章
   * @param {String} url feed地址
   * @param {Object} options feedparser参数
   */
  async feedParser(url, options) {
    const service = this;
    const req = request(url, options);
    const feedparser = new FeedParser(options);

    return new Promise((resolve, reject) => {
      const feeds = [];
      req.on('error', reject);
      feedparser.on('error', reject);

      req.on('response', function(res) {
        if(res.statusCode !== 200) {
          return reject(new Error('Bad status code'));
        }
        this.pipe(feedparser);
      });

      feedparser.on('readable', function() {
        let item;
        // eslint-disable-next-line no-cond-assign
        while (item = this.read()) {
          feeds.push(service.transformPost(item));
        }
      });
      feedparser.on('end', () => resolve(feeds));
    })
  }

  async run(url) {
    const posts = await this.feedParser(url);
    return Promise.all(posts);
  }
}
