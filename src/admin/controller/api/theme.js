'use strict';

import fs from 'fs';
import path from 'path';
import Base from './base.js';

const THEME_DIR = path.join(think.RESOURCE_PATH, 'theme');

export default class extends Base {
  async getAction(){
    let themes = (await think.promisify(fs.readdir)(THEME_DIR));
    let isExist = think.promisify(fs.exist);
    themes = themes.map(theme => ({id: theme, __info_file: path.join(THEME_DIR, theme, 'package.json')}))
                   .filter(async theme => await isExist(theme.__info_file))
                   .map(({id, __info_file}) => think.extend({id}, think.require(__info_file)));
    return this.success(themes);
  }
}
