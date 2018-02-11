import React from 'react';
import { Form, ValidatedInput } from 'react-bootstrap-validation';
import QRcode from 'qrcode-react';

import OptionsAction from '../action/options';
import OptionsStore from '../store/options';
import Base from 'base';
import BreadCrumb from 'admin/component/breadcrumb';
import TipAction from 'common/action/tip';
import ModalAction from 'common/action/modal';

module.exports = class extends Base {
  constructor(props) {
    super(props);
    this.state = {
      options: window.SysConfig.options,
      qrcode: '',
      step: 1,
      errmsg: ''
    }
  }
  componentDidMount() {
    this.listenTo(OptionsStore, this.handleTrigger.bind(this));
    OptionsAction.qrcode();
  }
  handleTrigger(data, type) {
    switch(type) {
      case 'getQrcodeSuccess':
        let url = data.otpauth_url;
        this.setState({
          qrcode: url
        });
        this.two_factor_auth = data.secret;
        break;
      case 'saveOptionsSuccess':
        let options = this.state.options;
        if(this.state.options.two_factor_auth) {
          options.two_factor_auth = '';
          this.setState({options: options});
          TipAction.success('关闭二步验证成功');
        }else{
          options.two_factor_auth = this.two_factor_auth;
          this.setState({options: options});
          TipAction.success('开启二步验证成功');
        }
        break;
      case 'Auth2FASuccess':
        this.updateStep(4);
        break;
    }
  }
  handleValidSubmit(values) {
    let data = {
      code: values.code,
      secret: this.two_factor_auth
    }
    OptionsAction.auth(data);
  }
  open2Fa() {
    OptionsAction.save({
      two_factor_auth: this.two_factor_auth
    });
  }
  close2Fa() {
    return ModalAction.confirm('提示', <div className="center">确定关闭吗？<br />
      <p className="gray">二次验证可以大大提升账户的安全性</p></div>, () => {
       OptionsAction.save({two_factor_auth: ''});
    }, 'modal-sm');
  }
  handleInvalidSubmit() {

  }
  updateStep(step) {
    this.setState({
      step: step || 1
    })
  }
  step0() {
    return (<div>
      <p>已经开启两步验证</p>
      <QRcode value={this.state.qrcode} size={256}/>
      <br />
      <br />
      <button type="submit" className="btn btn-primary" onClick={this.close2Fa.bind(this)}>关闭二步验证</button>
    </div>);
  }
  step1() {
    return (<div>
      <p>两步验证，对应的英文是 Two-factor Authentication(2FA)，或者 Two-step Verification。从名字可以看出，
        「两步」是 2FA 的重点，广义的 2FA 是指提供多种方案完成用户权限鉴定。</p>
      <p>开启两步验证后，登录系统后台，除了要提供用户名和密码外，还要提供额外的 Token，这样可以大大提高系统的安全性。</p>
      <div className="alert alert-warning" role="alert">
      为了提升系统安全性，本系统的两步验证开启后对所有人有效。
      </div>
      <button type="submit" className="btn btn-primary" onClick={this.updateStep.bind(this, 2)}>下一步</button>
    </div>);
  }
  step2() {
    return (<div>
      <h4>下载对应的应用</h4>
      <ul>
        <li>For Android, iOS:
          <a href="https://support.google.com/accounts/answer/1066447?hl=en">Google Authenticator</a>
        </li>
        <li>For Android and iOS:
          <a href="http://guide.duosecurity.com/third-party-accounts">Duo Mobile</a>
        </li>
        <li>For Windows Phone:
          <a href="https://www.microsoft.com/en-US/store/apps/Authenticator/9WZDNCRFJ3RJ">Authenticator</a>
        </li>
      </ul>
      <button type="submit" className="btn btn-primary" onClick={this.updateStep.bind(this, 3)}>已经安装，下一步</button>
    </div>)
  }
  step3() {
    return (<div>
      <p>打开两步验证的应用，扫描下面的二维码</p>
      <QRcode value={this.state.qrcode} size={256}/>
      <Form
        className="clearfix"
        onValidSubmit={this.handleValidSubmit.bind(this)}
        onInvalidSubmit={this.handleInvalidSubmit.bind(this)}
        >
        <br />
        <div className="form-group" style={{width: '256px'}}>
          <label>填写 6 位校验码</label>
          <ValidatedInput
            type='text'
            validate="required,isLength:6:6"
            errorHelp={{
              required: '填写 6 位校验码',
              isLength: '请填写 6 位校验码'
            }}
            maxLength="6"
            name='code'
            ref="code"
          />
        </div>
        <button type="submit" className="btn btn-primary">验证</button>
        <hr />
      </Form>
      <div>{this.state.errmsg}</div>
    </div>)
  }
  step4() {
    return (<div>
      <p>验证成功，点击下面的按钮开启二步验证</p>
      <button type="submit" className="btn btn-primary" onClick={this.open2Fa.bind(this)}>开启两步验证</button>
    </div>);
  }
  getContent() {
    if(this.state.options.two_factor_auth) {
      return this.step0();
    }
    switch(this.state.step) {
      case 1:
        return this.step1();
      case 2:
        return this.step2();
      case 3:
        return this.step3();
      case 4:
        return this.step4();
    }
  }
  render() {
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <div className="options-2fa">
            <h3 style={{marginBottom: '20px'}}>两步验证</h3>
            {this.getContent()}
          </div>
        </div>
      </div>
    );
  }
}
