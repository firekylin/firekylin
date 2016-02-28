'use strict';

import Base from './base.js';


export default class extends Base {
  indexAction(){
    return this.action('post', 'list');
  }
}