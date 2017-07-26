import React from 'react';
import md5 from 'md5';
import { Form, ValidatedInput } from 'react-bootstrap-validation';

import UserAction from '../action/user';
import UserStore from '../store/user';
import Base from 'base';
import TipAction from 'common/action/tip';


module.exports = class extends Base {
  componentDidMount() {
    this.listenTo(UserStore, this.handleTrigger.bind(this));
  }
  handleTrigger(data, type) {
    switch(type) {
      case 'LoginSuccess':
        TipAction.success('登录成功');
        setTimeout(() => {location.reload()}, 1000)
        break;
      case 'forgotSuccess':
        TipAction.success('重置密码邮件发送成功');
        break;
      case 'forgotFail':
        TipAction.fail(data.message);
        break;
      case 'resetSuccess':
        TipAction.success('新密码设置成功');
        setTimeout(() => location.href = '/admin', 1000);
        break;
      case 'resetFail':
        TipAction.fail(data.message);
        break;
    }
  }
  /**
   * get two factor auth
   * @return {} []
   */
  getTwoFactorAuth() {
    if(window.SysConfig.options.two_factor_auth) {
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
  handleValidSubmit(values) {
    values.password = md5(window.SysConfig.options.password_salt + values.password);
    UserAction.login(values);
  }
  handleInvalidSubmit() {

  }
  handleForgotSubmit(values) {
    UserAction.forgot(values);
  }

  handleResetSubmit(values) {
    values.password = md5(window.SysConfig.options.password_salt + values.password);
    values.token = this.props.location.query.token;
    UserAction.reset(values);
  }

  toggleForgot() {
    this.setState({forgot: !this.state.forgot});
  }

  renderReset() {
    return (
      <div className="container">
        <div className="row forgot">
          <h1 className="text-center">
            <a href="/">{window.SysConfig.options.title}</a>
          </h1>
          <Form
            className="clearfix"
            onValidSubmit={this.handleResetSubmit.bind(this)}
          >
            <ValidatedInput
                type="text"
                name="password"
                validate="required,isLength:8:30"
                placeholder="请输入新密码"
                errorHelp={{
                  required: '请填写密码',
                  isLength: '密码长度为8到30个字符'
                }}
            />
            <button type="submit" className="btn btn-primary btn-lg btn-block">设置新密码</button>
          </Form>
          <div className="form-footer">
            <div className="left back-site">
              <a href="/">← 回到{window.SysConfig.options.title}</a>
            </div>
            <div className="right forgot-password">
              <a href="/admin">重新登录</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderForgot() {
    return (
      <div className="container">
        <div className="row forgot">
          <h1 className="text-center">
            <a href="/">{window.SysConfig.options.title}</a>
          </h1>
          <Form
            className="clearfix"
            onValidSubmit={this.handleForgotSubmit.bind(this)}
          >
            <ValidatedInput
                type="text"
                name="user"
                validate="required"
                placeholder="用户名或电子邮箱地址"
                help="您会收到一封包含创建新密码链接的电子邮件。"
                errorHelp="请输入您的用户名或电子邮箱地址"
            />
            <button type="submit" className="btn btn-primary btn-lg btn-block">获取新密码</button>
          </Form>
          <div className="form-footer">
            <div className="left back-site">
              <a href="/">← 回到{window.SysConfig.options.title}</a>
            </div>
            <div className="right forgot-password">
              <a href="javascript:void(0)" onClick={this.toggleForgot.bind(this)}>重新登录</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    if(this.props.location.query.reset) {
      return this.renderReset();
    }

    if(this.state.forgot) {
      return this.renderForgot();
    }

    return (
      <div className="container">
        <div className="row">
            <div className="login">
              <h1 className="text-center">
              <a href="/">{window.SysConfig.options.title}</a>
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
              <div className="form-footer">
                <div className="left back-site">
                  <a href="/">← 回到{window.SysConfig.options.title}</a>
                </div>
                <div className="right forgot-password">
                  <a href="javascript:void(0)" onClick={this.toggleForgot.bind(this)}>找回密码</a>
                </div>
              </div>
            </div>
        </div>
      </div>
    );
  }
}
