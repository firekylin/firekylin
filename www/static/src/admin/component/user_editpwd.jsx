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
  }
  componentDidMount(){
    this.listenTo(UserStore, this.handleTrigger.bind(this));
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
        TipAction.success('更新成功');
        this.setState({submitting: false});
        break;
    }
  }
  /**
   * save
   * @return {}       []
   */
  handleValidSubmit(values){
    delete values.repassword;
    let password = md5(SysConfig.options.password_salt + values.password);
    values.password = password;
    this.setState({submitting: true});
    UserAction.savepwd(values);
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

    let validatePrefix = '';
    let validates = {
      name: 'isLength:4:20',
      email: 'isEmail',
      password: val => {

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
            className="user-editpwd clearfix"
            onValidSubmit={this.handleValidSubmit.bind(this)}
            onInvalidSubmit={this.handleInvalidSubmit.bind(this)}
          >
            <div className="pull-left">
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
          </Form>
        </div>
      </div>
    );
  }
}
