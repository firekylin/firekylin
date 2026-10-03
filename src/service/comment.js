const request = require('request');

const reqIns = request.defaults({
  strictSSL: false,
  rejectUnauthorized: false
});

const _ = {
  get: think.promisify(reqIns, reqIns),
  post: think.promisify(reqIns.post, reqIns)
};

module.exports = class extends think.Service {
  /**
   * sync post comments
   * @return {[type]} [description]
   */
  async sync() {
    const optionsModel = this.model('options');
    const options = await optionsModel.getOptions();
    const comment = options.comment;
    comment.site_url = options.site_url;

    if (comment.name) {
      if (comment.type === 'disqus') {
        return this.syncFromDisqus(comment);
      } else if (comment.type === 'hypercomments') {
        return this.syncFromHyperComments(comment);
      } else if (comment.type === 'duoshuo') {
        return this.syncFromDuoshuo(comment);
      } else if (comment.type === 'changyan') {
        return this.syncFromChangyan(comment);
      } else if (comment.type === 'netease') {
        return this.syncFromNetease(comment);
      } else if (comment.type === 'gitalk') {
        return this.syncFromGitalk(comment);
      }
    }
  }

  /**
   * get post data
   * @return {[type]} [description]
   */
  async getPostData() {
    const postModel = this.model('post');
    const allPost = await postModel.setRelation(false)
      .order('create_time DESC')
      .field('id,pathname,comment_num,type')
      .select();
    const keys = {};
    allPost.map(item => {
      const key = think.md5(item.pathname);
      keys[key] = item;
      return key;
    });
    return keys;
  }
  /**
   * sync from disqus
   * @return {[type]} [description]
   */
  async syncFromDisqus(comment) {
    const postData = await this.getPostData();
    if (think.isEmpty(postData)) {
      return;
    }
    const threads = Object.keys(postData); // .join('&l=')
    let index = 0;
    while (true) { // eslint-disable-line no-constant-condition
      const ths = threads.slice(index, index + 10);
      index += 10;
      if (!ths.length) {
        return;
      }
      const url = `https://${comment.name}.disqus.com/count-data.js?1=${ths.join('&1=')}`;
      // think.log(`sync comments ${url}`);
      const response = await _.get(url).catch(() => {});
      if (!response) {
        continue;
      }
      let data = response.body.match(/DISQUSWIDGETS.displayCount\(([^()]+)\);/);
      if (!data) {
        continue;
      }

      data = JSON.parse(data[1]).counts;
      const promises = data.map(item => {
        if (item.comments === postData[item.id].comment_num) {
          return;
        }
        const id = postData[item.id].id;
        return this.model('post').where({
          id: id
        }).update({
          comment_num: item.comments
        });
      });
      await Promise.all(promises);
      if (promises.length) {
        await this.clearPostCache();
      }
    }
  }

  async syncFromHyperComments(comment) {
    const postData = await this.getPostData();
    if (think.isEmpty(postData)) {
      return;
    }

    const url = 'https://c1n1.hypercomments.com/api/get_count';
    let site_url = comment.site_url;
    if (site_url.slice(-1) !== '/') {
      site_url = site_url + '/';
    }

    for (const i in postData) {
      const post = postData[i];
      post.url = site_url + (post.type ? 'page/' : 'post/') + post.pathname + '.html';
    }

    const threads = Object.keys(postData);
    let index = 0;
    while (true) { // eslint-disable-line no-constant-condition
      const ths = threads.slice(index, index + 50);
      index += 50;

      if (!ths.length) {
        return;
      }

      const formData = {
        data: JSON.stringify({
          widget_id: comment.name,
          href: ths.map(th => postData[th].url)
        }),
        host: site_url
      };
      const resp = await _.post({
        url,
        form: formData
      });
      const data = JSON.parse(resp.body).data;

      if (!data) {
        return;
      }

      const promises = [];
      for (let i = 0; i < ths.length; i++) {
        const post = postData[ths[i]];
        if (data[i].cm === post.comment_num) {
          continue;
        }

        const id = post.id;
        promises.push(
          this.model('post')
            .where({
              id
            })
            .update({
              comment_num: data[i].cm
            })
        );
      }

      await Promise.all(promises);
      if (promises.length) {
        await this.clearPostCache();
      }
    }
  }
  /**
   * sync from duoshuo
   * @return {[type]} [description]
   */
  async syncFromDuoshuo(comment) {
    const postData = await this.getPostData();
    if (think.isEmpty(postData)) {
      return;
    }
    const threads = Object.keys(postData);
    let index = 0;
    while (true) { // eslint-disable-line no-constant-condition
      const ths = threads.slice(index, index + 10);
      index += 10;
      if (!ths.length) {
        return;
      }
      const url = `http://api.duoshuo.com/threads/counts.json?short_name=${comment.name}&threads=${ths.join(',')}`;
      // think.log(`sync comments ${url}`);
      const response = await _.get(url);
      const data = JSON.parse(response.body).response;
      const promises = [];
      for (const key in data) {
        if (data[key].comments === postData[key].comment_num) {
          continue;
        }
        const id = postData[key].id;
        const promise = this.model('post').where({
          id: id
        }).update({
          comment_num: data[key].comments
        });
        promises.push(promise);
      }
      await Promise.all(promises);
      if (promises.length) {
        await this.clearPostCache();
      }
    }
  }
  /**
   * sync from changyan
   * @return {[type]} [description]
   */
  async syncFromChangyan(comment) {
    const postData = await this.getPostData();
    if (think.isEmpty(postData)) {
      return;
    }
    const threads = Object.keys(postData);
    let index = 0;
    while (true) { // eslint-disable-line no-constant-condition
      const ths = threads.slice(index, index + 10);
      index += 10;
      if (!ths.length) {
        return;
      }
      const url = `http://changyan.sohu.com/api/2/topic/count?client_id=${comment.name}&topic_id=${ths.join(',')}`;
      // think.log(`sync comments ${url}`);
      const response = await _.get(url);
      const data = JSON.parse(response.body).result;
      const promises = [];
      for (const key in data) {
        if (data[key].comments === postData[key].comment_num) {
          continue;
        }
        const id = postData[key].id;
        const promise = this.model('post').where({
          id: id
        }).update({
          comment_num: data[key].comments
        });
        promises.push(promise);
      }
      await Promise.all(promises);
      if (promises.length) {
        await this.clearPostCache();
      }
    }
  }
  /**
   * sync from duoshuo
   * @return {[type]} [description]
   */
  async syncFromNetease(comment) {
    const postData = await this.getPostData();
    if (think.isEmpty(postData)) {
      return;
    }

    let site_url = comment.site_url;
    if (site_url.slice(-1) !== '/') {
      site_url = site_url + '/';
    }

    for (const i in postData) {
      const post = postData[i];
      post.url = site_url + (post.type ? 'page/' : 'post/') + post.pathname + '.html';
    }

    const threads = Object.keys(postData);
    let index = 0;
    const url = `https://api.gentie.163.com/products/${comment.name}/threads/joincounts`;
    while (true) { // eslint-disable-line no-constant-condition
      const ths = threads.slice(index, index + 50);
      if (!ths.length) {
        return;
      }
      index += 50;
      // think.log(`sync comments ${url}`);
      const formData = {
        data: JSON.stringify(
          ths.map(th => ({
            url: postData[th].url,
            sourceId: null
          }))
        )
      };
      const resp = await _.post({
        url,
        form: formData
      });
      const data = JSON.parse(resp.body).data;

      const promises = [];
      for (let i = 0; i < ths.length; i++) {
        const post = postData[ths[i]];
        if (data[i] === post.comment_num) {
          continue;
        }

        const id = post.id;
        promises.push(this.model('post').where({
          id
        }).update({
          comment_num: data[i]
        }));
      }

      await Promise.all(promises);
      if (promises.length) {
        await this.clearPostCache();
      }
    }
  }

  /**
   *
   * @param {*sync form gitalk in github} comment
   */
  async syncFromGitalk(comment) {
    const postData = await this.getPostData();
    if (think.isEmpty(postData)) {
      return;
    }

    // get gtalk and github config
    const gtalkConfig = JSON.parse(comment.name);

    const base64Header = Buffer.from(gtalkConfig.githubUserName + ':' + gtalkConfig.githubPassWord).toString('base64');

    const url = 'https://api.github.com/search/issues?q=author:' + gtalkConfig.owner;
    const options = {
      url: url,
      headers: {
        'User-Agent': 'request',
        'Authorization': 'Basic ' + base64Header
      }
    };

    const promises = [];

    for (const i in postData) {
      const post = postData[i];
      post.url = '/' + (post.type ? 'page/' : 'post/') + post.pathname + '.html';
      options.url = url + '+label:' + i;

      let response = await _.get(options);

      response = JSON.parse(response.body);
      let commentNum = 0;
      if (response && response.total_count === 1) {
        commentNum = response.items[0].comments;
      } else {
        commentNum = 0;
      }

      // update commentNum
      if (commentNum !== post.comment_num) {
        const id = post.id;
        promises.push(this.model('post').where({
          id
        }).update({
          comment_num: commentNum
        }));
      }
    }

    await Promise.all(promises);
    if (promises.length) {
      await this.clearPostCache();
    }
  }

  clearPostCache() {
    return think.cache('post_1', null);
  }
};
