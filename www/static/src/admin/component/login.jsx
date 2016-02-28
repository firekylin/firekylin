import React from 'react';
import Base from 'base';
import md5 from 'md5';

import { Form, ValidatedInput } from 'react-bootstrap-validation';

import UserAction from '../action/user';
import UserStore from '../store/user';

import TipAction from 'common/action/tip';

export default class extends Base {
  componentDidMount(){
    this.listenTo(UserStore, this.handleTrigger.bind(this));
  }
  handleTrigger(data, type){
    switch(type){
      case 'LoginSuccess':
        TipAction.success('登录成功');
        setTimeout(() => {location.reload()}, 1000)
        break;
    }
  }
  /**
   * get two factor auth
   * @return {} []
   */
  getTwoFactorAuth(){
    if(SysConfig.options.two_factor_auth){
      return (
        <div className="form-group">
          <ValidatedInput
            type="text"
            name="two_factor_auth"
            ref="two_factor_auth"
            className="form-control"
            validate="required,isLength:6:6"
            placeholder="二步验证码"
            errorHelp={{
              required: '请填写二步验证码',
              isLength: '长度为6个字符'
            }}
          />
        </div>
      );
    }
  }
  handleValidSubmit(values){
    values.password = md5(SysConfig.options.password_salt + values.password);
    UserAction.login(values);
  }
  handleInvalidSubmit(){

  }
  render() {
    return (
      <div className="container">
        <div className="row">
            <div className="login">
              <h1 className="text-center">
              <a href="/">{SysConfig.options.title}</a>
              </h1>
              <Form
              className="clearfix"
              onValidSubmit={this.handleValidSubmit.bind(this)}
              onInvalidSubmit={this.handleInvalidSubmit.bind(this)}
              >
              <div className="form-group">
                <ValidatedInput
                  type="text"
                  name="username"
                  ref="username"
                  className="form-control"
                  validate="required,isLength:4:20"
                  placeholder="用户名"
                  errorHelp={{
                    required: '请填写用户名',
                    isLength: '长度为4到20个字符'
                  }}
                />
              </div>
              <div className="form-group">
                <ValidatedInput
                  type="password"
                  name="password"
                  ref="password"
                  className="form-control"
                  validate="required,isLength:8:30"
                  placeholder="密码"
                  errorHelp={{
                    required: '请填写密码',
                    isLength: '密码长度为8到30个字符'
                  }}
                />
              </div>
              {this.getTwoFactorAuth()}
              <button type="submit" className="btn btn-primary btn-lg btn-block">登录</button>
            </Form>
            </div>
        </div>
      </div>
    );
  }
}
