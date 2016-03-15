import React from 'react';
import ReactDom from 'react-dom';
import Base from 'base';
import {Link} from 'react-router';
import classnames from 'classnames';
import { Form, ValidatedInput } from 'react-bootstrap-validation';
import md5 from 'md5';
import QRcode from 'qrcode-react';

import BreadCrumb from 'admin/component/breadcrumb';
import OptionsAction from '../action/options';
import OptionsStore from '../store/options';
import TipAction from 'common/action/tip';
import ModalAction from 'common/action/modal';

export default class extends Base {
  constructor(props){
    super(props);
    this.state = {
      options: SysConfig.options,
      qrcode: ''
    }
  }
  componentDidMount(){
    this.listenTo(OptionsStore, this.handleTrigger.bind(this));
    OptionsAction.qrcode();
  }
  handleTrigger(data, type){
    switch(type){
      case 'getQrcodeSuccess':
        let url = data.otpauth_url;
        this.setState({
          qrcode: url
        });
        this.two_factor_auth = data.secret;
        break;
      case 'saveOptionsSuccess':
        let options = this.state.options;
        if(this.state.options.two_factor_auth){
          options.two_factor_auth = '';
          this.setState({options: options});
          TipAction.success('关闭二步验证成功');
        }else{
          options.two_factor_auth = this.two_factor_auth;
          this.setState({options: options});
          TipAction.success('开启二步验证成功');
        }
        break;
    }
  }
  handleValidSubmit(values){
    let two_factor_auth = this.state.options.two_factor_auth ? '' : this.two_factor_auth;
    if(!two_factor_auth){
      return ModalAction.confirm('提示', <div className="center">确定关闭吗？<br /><p className="gray">二次验证可以大大提升账户的安全性</p></div>, () => {
        OptionsAction.save({two_factor_auth: two_factor_auth});
      }, 'modal-sm');
    }
    OptionsAction.save({two_factor_auth: two_factor_auth});
  }
  handleInvalidSubmit(){

  }
  render(){
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <div className="options-2fa">
            <h3 style={{marginBottom: '20px'}}>二步验证</h3>
            {this.state.options.two_factor_auth ? '' : <p>开启二步验证可以大大提升帐号的安全性，可以通过下面的步骤开启。</p>}
            <h4>下载对应的应用</h4>
            <ul>
              <li>For Android, iOS, and Blackberry:
                <a href="https://support.google.com/accounts/answer/1066447?hl=en">Google Authenticator</a>
              </li>
              <li>For Android and iOS:
                <a href="http://guide.duosecurity.com/third-party-accounts">Duo Mobile</a>
              </li>
              <li>For Windows Phone:
                <a href="https://www.microsoft.com/en-US/store/apps/Authenticator/9WZDNCRFJ3RJ">Authenticator</a>
              </li>
            </ul>
            <h4>扫描下面的二维码</h4>
            <QRcode value={this.state.qrcode} size={256}/>
            <Form
              className="clearfix"
              onValidSubmit={this.handleValidSubmit.bind(this)}
              onInvalidSubmit={this.handleInvalidSubmit.bind(this)}
              >
              <br />
              <button type="submit" className="btn btn-primary">{this.state.options.two_factor_auth ? '关闭': '开启'}二步验证</button>
              <hr />
            </Form>
          </div>
        </div>
      </div>
    );
  }
}
