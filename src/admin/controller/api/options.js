'use strict';

import Base from './base.js';

export default class extends Base {
  async putAction(){
    let data = this.post();
    if(think.isEmpty(data)){
      return this.fail('DATA_EMPTY');
    }
    //@TODO 校验权限
    
    let model = this.model('options');
    let result = await model.updateOptions(data);
    this.success(result);
  } 
}