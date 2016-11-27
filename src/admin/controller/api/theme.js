'use strict';

import fs from 'fs';
import path from 'path';
import Base from './base.js';

const THEME_DIR = path.join(think.RESOURCE_PATH, 'theme');

export default class extends Base {
  async getAction(){
    let themes = (await think.promisify(fs.readdir)(THEME_DIR));

    let result = [];
    for(let theme of themes) {
      let infoFile = path.join(THEME_DIR, theme, 'package.json');
      try {
        let stat = await think.promisify(fs.stat)(infoFile);
        result.push( think.extend({id: theme}, think.require(infoFile)) );
      } catch(e) {
        console.log(e);
      }
    }
    return this.success(result);
  }
}
