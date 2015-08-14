import moment from 'moment';

import base from './apiBase';
import pack from '../../../package.json';


export default class extends base {

  init(http) {
    super.init(http);

    this.modelInstance = this.model('config');
  }

  async getAction() {

    let mysql = await this.modelInstance.query('SELECT VERSION() as version');

    let data = {
      nodeVersion: process.versions.node,
      v8Version: process.versions.v8,
      platform: process.platform,
      thinkjsVersion: think.version,
      firekylinVersion: pack.version,
      mysqlVersion: mysql[0].version
    };

    return this.success({
      versions: data,
      config: await this.getConfig()
    });
  }

  async putAction() {
    let model = this.modelInstance;
    let submitConfig = this.post();
    let oldConfig = await this.getConfig();
    let newConfig = Object.keys(submitConfig)
        .filter(key => submitConfig[key] != oldConfig[key])
        .map(key => ({
          key: key,
          value: submitConfig[key]
        }));

    let result = await Promise.all(newConfig.map(configItem => {
      return model.add(configItem, {}, true);
    }));

    return this.success({result});
  }

  postAction() {
    return this.__call();
  }

  deleteAction() {
    return this.__call();
  }

  async getConfig() {
    let items = await this.modelInstance.select();
    let siteConfig = {};

    items.forEach(item => siteConfig[item.key] = item.value);

    return siteConfig;
  }

}