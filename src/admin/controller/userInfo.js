import moment from 'moment';

import base from './apiBase';


export default class extends think.controller.base {
  async updatePswAction(){
    let curPsw = this.param('currentPsw');
    let newPsw = this.param('newPsw');
    
  }
}