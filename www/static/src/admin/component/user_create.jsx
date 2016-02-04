import React from 'react';
import ReactDom from 'react-dom';
import Base from '../../common/component/base';
import {Link} from 'react-router';
import classnames from 'classnames';
import { Form, ValidatedInput } from 'react-bootstrap-validation';
import md5 from 'md5';

import UserAction from '../action/user';
import UserStore from '../store/user';

export default class extends Base {
  constructor(props){
    super(props);
    this.state = {
      submitting: false
    }
  }
  componentDidMount(){
    this.listenTo(UserStore, () => {});
  }
  /**
   * save
   * @return {}       []
   */
  handleValidSubmit(values){
    values.type = ReactDom.findDOMNode(this.refs.type).value;
    values.status = ReactDom.findDOMNode(this.refs.status).value;
    delete values.repassword;
    let password = md5(SysConfig.options.password_salt + values.password);
    values.password = password;
    let result = UserAction.save(values);
    console.log(result)
  }
  /**
   * handle invalid
   * @return {} []
   */
  handleInvalidSubmit(){
    
  }
  /**
   * render
   * @return {} []
   */
  render(){
    return (
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
              validate="required,isLength:4:20" 
              name="username"
              ref="username"
              className="form-control" 
              placeholder="4到20个字符"
              errorHelp={{
                required: '请输入用户名',
                isLength: '长度为4到20个字符'
              }}
            />
          </div>
          <div className="form-group">
            <label>邮箱</label>
            <ValidatedInput 
              type="email" 
              validate="required,isEmail" 
              name="email" 
              ref="email"
              className="form-control" 
              placeholder="" 
              errorHelp={{
                required: '请输入邮箱'
              }}
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <ValidatedInput 
              type="password" 
              validate="required,isLength:8:60" 
              name="password" 
              ref="password"
              className="form-control" 
              placeholder="8到60个字符"
              errorHelp={{
                required: '请输入密码',
                isLength: '密码长度为8到60个字符'
              }}
            />
          </div>
          <div className="form-group ">
            <label>确认密码</label>
            <ValidatedInput 
              type="password" 
              validate={(val, context) => val === context.password} 
              name="repassword" 
              ref="repassword"
              className="form-control" 
              placeholder="" 
              errorHelp='密码不一致' 
            />
          </div>
          <button type="submit" className="btn btn-primary">提交</button>
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
            />
          </div>
          
          <div className="form-group">
            <label>用户组</label>
            <select className="form-control" ref="type">
              <option value="1">管理员</option>
              <option value="2">编辑</option>
            </select>
          </div>
          <div className="form-group">
            <label>状态</label>
            <select className="form-control" ref="status">
              <option value="1">有效</option>
              <option value="2">禁用</option>
            </select>
          </div>
        </div>
      </Form>
    );
  }
}