'use strict';

import Base from './base.js';
import fs from 'fs';


export default class extends Base {
  /**
   * sync comment num
   * @return {[type]} [description]
   */
  async syncCommentAction(){
    let SyncService = this.service('comment');
    let instance = new SyncService();
    await instance.sync();
    this.success();
  }
}