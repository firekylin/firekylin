import React from 'react';
import ReactDom from 'react-dom';
import Base from 'base';
import {Link} from 'react-router';
import classnames from 'classnames';
import { Form, ValidatedInput } from 'react-bootstrap-validation';
import md5 from 'md5';

import BreadCrumb from 'admin/component/breadcrumb';
import UserAction from '../action/user';
import UserStore from '../store/user';
import TipAction from 'common/action/tip';

export default class extends Base {
  constructor(props){
    super(props);
    this.state = {
      submitting: false,
      userInfo: {}
    }
    this.id = this.props.params.id | 0;
  }
  componentDidMount(){
    this.listenTo(UserStore, this.handleTrigger.bind(this));
    if(this.id){
      UserAction.select(this.id);
    }
  }
  /**
   * hanle trigger
   * @param  {[type]} data [description]
   * @param  {[type]} type [description]
   * @return {[type]}      [description]
   */
  handleTrigger(data, type){
    switch(type){
      case 'saveUserFail':
        this.setState({submitting: false});
        break;
      case 'saveUserSuccess':
        TipAction.success(this.id ? '保存成功' : '添加成功');
        this.setState({submitting: false});
        setTimeout(() => this.redirect('user/list'), 1000);
        break;
      case 'getUserInfo':
        this.setState({userInfo: data});
        break;
    }
  }
  /**
   * save
   * @return {}       []
   */
  handleValidSubmit(values){
    values.type = ReactDom.findDOMNode(this.refs.type).value;
    values.status = ReactDom.findDOMNode(this.refs.status).value;
    delete values.repassword;
    if( this.id && values.password === '' ) {
      delete values.password;
    } else {
      let password = md5(SysConfig.options.password_salt + values.password);
      values.password = password;
    }
    this.setState({submitting: true});
    if(this.id){
      values.id = this.id;
    }
    UserAction.save(values);
  }
  /**
   * handle invalid
   * @return {} []
   */
  handleInvalidSubmit(){

  }
  /**
   * change input value
   * @param  {[type]} type  [description]
   * @param  {[type]} event [description]
   * @return {[type]}       [description]
   */
  changeInput(type, event){
    let value = event.target.value;
    let userInfo = this.state.userInfo;
    userInfo[type] = value;
    this.setState({
      userInfo: userInfo
    });
  }
  /**
   * 获取属性
   * @param  {[type]} type [description]
   * @return {[type]}      [description]
   */
  getProps(type){
    let prop = {
      value: this.state.userInfo[type] || '',
      onChange: this.changeInput.bind(this, type)
    };
    if(this.id && ['name', 'email'].indexOf(type) > -1 && this.state.userInfo[type]){
      prop.readOnly = true;
    }

    let validatePrefix = '';
    if(!this.id && ['name', 'email'].indexOf(type) > -1){
      validatePrefix = 'required,';
    }
    let validates = {
      name: 'isLength:4:20',
      email: 'isEmail',
      password: val => {
        //编辑时可以不用输入用户名
        if( this.id && val === '' ) {
          return true;
        }

        if( val === '' ) {
          return '请输出密码';
        }

        if( val.length < 8 || val.length > 30 ) {
          return '密码长度为8到30个字符';
        }

        return true;
      },
      repassword: (val, context) => val === context.password
    }
    if(typeof validates[type] === 'string'){
      prop.validate = validatePrefix + validates[type];
    }else{
      prop.validate = validates[type];
    }

    return prop;
  }

  getOptionProp(type, value){
    let val = this.state.userInfo[type];
    if(val == value){
      return {selected: true}
    }
    return {};
  }
  /**
   * render
   * @return {} []
   */
  render(){
    let props = {}
    if(this.state.submitting){
      props.disabled = true;
    }

    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <Form
            className="user-create clearfix"
            onValidSubmit={this.handleValidSubmit.bind(this)}
            onInvalidSubmit={this.handleInvalidSubmit.bind(this)}
          >
            <div className="pull-left">
              <div className="form-group">
                <label>用户名</label>
                <ValidatedInput
                  type="text"
                  name="username"
                  ref="username"
                  className="form-control"
                  placeholder="4到20个字符"
                  {...this.getProps('name')}
                  errorHelp={{
                    required: '请输入用户名',
                    isLength: '长度为4到20个字符'
                  }}
                />
                <p className="help-block">登录时所用的名称，不能重复。</p>
              </div>
              <div className="form-group">
                <label>邮箱</label>
                <ValidatedInput
                  type="text"
                  name="email"
                  ref="email"
                  className="form-control"
                  {...this.getProps('email')}
                  errorHelp={{
                    required: '请输入邮箱',
                    isEmail: '邮箱格式不正确'
                  }}
                />
                <p className="help-block">用户主要联系方式，不能重复。</p>
              </div>
              <div className="form-group">
                <label>密码</label>
                <ValidatedInput
                  type="password"
                  name="password"
                  ref="password"
                  className="form-control"
                  placeholder="8到30个字符"
                  {...this.getProps('password')}
                />
                <p className="help-block">建议使用特殊字符与字母、数字的混编方式，增加安全性。</p>
              </div>
              <div className="form-group ">
                <label>确认密码</label>
                <ValidatedInput
                  type="password"
                  name="repassword"
                  ref="repassword"
                  className="form-control"
                  placeholder=""
                  {...this.getProps('repassword')}
                  errorHelp='密码不一致'
                />
              </div>
              <button type="submit" {...props} className="btn btn-primary">{this.state.submitting ? '提交中...' : '提交'}</button>
            </div>
            <div className="pull-left">
              <div className="form-group">
                <label>别名</label>
                <ValidatedInput
                  type="text"
                  name="display_name"
                  ref="display_name"
                  className="form-control"
                  placeholder="显示名称"
                  {...this.getProps('display_name')}
                />
              </div>

              <div className="form-group">
                <label>用户组</label>
                <select className="form-control" ref="type">
                  <option value="2" {...this.getOptionProp('type', '2')}>编辑</option>
                  <option value="1" {...this.getOptionProp('type', '1')}>管理员</option>
                </select>
              </div>
              <div className="form-group">
                <label>状态</label>
                <select className="form-control" ref="status">
                  <option value="1" {...this.getOptionProp('status', '1')}>有效</option>
                  <option value="2" {...this.getOptionProp('status', '2')}>禁用</option>
                </select>
              </div>
            </div>
          </Form>
        </div>
      </div>
    );
  }
}
