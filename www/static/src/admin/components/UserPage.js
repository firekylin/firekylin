import React from 'react';
import autobind from 'autobind-decorator';

import BaseComponent from './BaseComponent';
import AlertActions from '../actions/AlertActions';
import UserActions from '../actions/UserActions';

import { UserStore } from '../stores/UserStores';

@autobind
class UserPage extends BaseComponent {
  constructor(props){
    super(props);
    this.state = {
      isModifyingPsw: false,
      isAddingUser: false
    };
  }
  
  componentDidMount() {
    this.subscribe(
        UserStore.listen(this.onModifyPsw)
    );
  }

  onModifyPsw(){
      // this.transitionTo('/admin');
      // this.setState({isModifyingPsw: false});
    
  }
  handleClickModifyPsw() {
    this.setState({isModifyingPsw: true});
  }
  handleSubmitModifyPsw(e) {
    let form = e.target;
    let password = form.password.value;
    let newPassword = form.newPassword.value;
    let repeat = form.repeat.value;
    if(password && newPassword && newPassword === repeat) {
      //submit the old and new psw
      UserActions.modifyPsw(password, newPassword).then(() => {
        AlertActions.success("成功修改密码");
        this.setState({isModifyingPsw: false});
      }).catch((err)=>{
        AlertActions.error(err);
      });
    }
    return false;
  }
  getModifyPswTpl() {
    let tpl = '';
    if(this.state.isModifyingPsw) {
      tpl = (        
          <form className="modify-panel" onSubmit={this.handleSubmitModifyPsw}>
          <dl>
            <dt>请输入原来的密码</dt>
            <dd>
              <input className="text" name="password" type="password" placeholder="请输入原来的密码"/>
            </dd>
            <dt>请输入新密码</dt>
            <dd>
              <input className="text" name="newPassword" type="password" placeholder="请输入新密码"/>
            </dd>
            <dt>请再次输入新密码</dt>
            <dd>
              <input className="text" name="repeat" type="password" placeholder="请再次输入新密码"/>
            </dd>
          </dl>
          <input className="button" type="submit" value="提交修改"/>
        </form>
      );
    } else {
      tpl = <button className="button green small" onClick={this.handleClickModifyPsw}>修改密码</button>
    }
    return tpl;
  }
  render() {    
    return (
        <div className="UserPage page">
          
          <div className="title">
            <h2>用户管理</h2>
          </div>
          <div className="personal-manage content">
            {this.getModifyPswTpl()}
          </div>
        </div>
    )
  }

  onChange(data) {
  }
}

export default UserPage;