'use strict';

import Base from './base.js';


export default class extends Base {
  /**
   * index
   * @return {[type]} [description]
   */
  indexAction(){
    return this.action('post', 'list');
  }
  /**
   * install
   * @return {[type]} [description]
   */
  async installAction(){
    if(this.isGet()){
      if(firekylin.isInstalled){
        return this.redirect('/');
      }
      return this.display();
    }
    if(firekylin.isInstalled){
      return this.fail('SYSTERM_INSTALLED');
    }
    
    let errors = this.assign('errors');
    if(!think.isEmpty(errors)){
      this.assign('message', errors[Object.keys(errors)[0]]);
      return this.display();
    }

    let data = this.post();
    let dbInfo = {
      host: data.db_host,
      port: data.db_port,
      database: data.db_name,
      user: data.db_account,
      password: data.db_password,
      prefix: data.db_table_prefix
    }
    let account = {
      username: data.username,
      password: data.password
    }
    let InstallService = this.service('install');
    let instance = new InstallService(dbInfo, account, this.ip());
    let message = 'success';
    await instance.run().catch(err => {
      message = err;
    });
    this.assign('message', message);
    this.assign('data', data);
    this.display();
  }
}