const {CREDENTIAL_PREFIX} = require('../ai/store');

function isDuplicateKey(error) {
  return ['ER_DUP_ENTRY', '23505', 'SQLITE_CONSTRAINT', 'SQLITE_CONSTRAINT_PRIMARYKEY'].includes(error.code) ||
    /duplicate key|unique constraint|UNIQUE constraint failed/i.test(error.message || '');
}

module.exports = class extends think.Model {
  get pk() {
    return 'key';
  }

  /**
   * get options
   * @return {} []
   */
  async getOptions(includePrivate = false) {
    const data = await this.select();
    const ret = {};
    data.forEach(item => {
      ret[item.key] = item.value;
    });
    if (!includePrivate) {
      delete ret.jwt_secret;
      delete ret.comment_jwt_secret;
      delete ret.comment_schema_version;
      delete ret.ai_credentials;
      for (const key of Object.keys(ret)) {
        if (key.startsWith(CREDENTIAL_PREFIX)) delete ret[key];
      }
    }

    // comment type
    if (think.isEmpty(ret)) {
      return {};
    }

    if (ret.comment && think.isString(ret.comment)) {
      ret.comment = JSON.parse(ret.comment);
    }
    const comment = {...(ret.comment || {})};
    if (!includePrivate) {
      delete comment.captchaSecret;
      delete comment.smtpPass;
    }
    Reflect.deleteProperty(comment, 'name');
    Reflect.deleteProperty(comment, 'type');
    ret.comment = {
      audit: false,
      forceLogin: false,
      pageSize: 10,
      locale: 'zh-CN',
      ipQps: 60,
      commentSorting: 'latest',
      dark: false,
      meta: ['nick', 'mail', 'link'],
      requiredMeta: [],
      wordLimit: 0,
      emoji: true,
      reaction: false,
      imageUploader: true,
      highlighter: true,
      texRenderer: true,
      search: true,
      noCopyright: false,
      noRss: false,
      forbiddenWords: [],
      disallowIPList: [],
      likeIncMax: 1,
      levels: [],
      avatarProxy: '',
      ...comment
    };
    // upload settings
    if (ret.upload && think.isString(ret.upload)) {
      ret.upload = JSON.parse(ret.upload);
    }
    if (!ret.upload) {
      ret.upload = {type: 'local'};
    }
    if (ret.push_sites && think.isString(ret.push_sites)) {
      ret.push_sites = JSON.parse(ret.push_sites);
    }
    if (!ret.push_sites) {
      ret.push_sites = {};
    }
    if (ret.rssImportList && think.isString(ret.rssImportList)) {
      ret.rssImportList = JSON.parse(ret.rssImportList);
    }
    if (!ret.rssImportList) {
      ret.rssImportList = [];
    }
    return ret;
  }
  /**
   * update options
   * @return {} []
   */
  async updateOptions(key, value) {
    const data = think.isObject(key) ? think.extend({}, key) : {[key]: value};
    const promises = [];
    for (const key in data) {
      const value = data[key];
      const exist = await this.where({key: key}).count('key');
      let p;
      if (Number(exist) > 0) {
        p = this.where({key: key}).update({value: value});
      } else {
        p = this.add({key, value});
      }
      promises.push(p);
    }
    await Promise.all(promises);
    await this.getOptions();

    // if `auto_summary` is changed, then rebuild all summaries of posts
    if (typeof data.auto_summary !== 'undefined') {
      const postModel = think.model('post');
      // doesn't wait for return
      await postModel.updateAllPostSummaries();
    }
  }

  async ensureOption(key, value) {
    try {
      await this.add({key, value});
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
    const row = await this.where({key}).find();
    return row.value;
  }

  async getCredentialValue(key) {
    const row = await this.where({key}).find();
    return row && row.key ? row.value : undefined;
  }

  async setCredentialValue(key, value) {
    // Each credential has its own primary-key row, so writes for different plugins cannot overwrite each other.
    const updated = await this.where({key}).update({value});
    if (Number(updated) > 0) return;
    try {
      await this.add({key, value});
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      // Another worker inserted this key after our update attempt.
      await this.where({key}).update({value});
    }
  }

  async deleteCredentialValue(key) {
    await this.where({key}).delete();
  }
};
