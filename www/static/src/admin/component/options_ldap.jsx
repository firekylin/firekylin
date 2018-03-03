import React from 'react';
import { Form, ValidatedInput, Radio, RadioGroup } from 'react-bootstrap-validation';

import OptionsAction from '../action/options';
import OptionsStore from '../store/options';
import Base from 'base';
import BreadCrumb from 'admin/component/breadcrumb';
import TipAction from 'common/action/tip';
import ModalAction from 'common/action/modal';

module.exports = class extends Base {
  constructor(props) {
    super(props);

    const { options } = window.SysConfig;
    this.state = {
      options: options,
      submitting: false,
      step: options.ldap_on === '1' ? 0 : 1,
      errmsg: ''
    }
  }
  componentDidMount() {
    this.listenTo(OptionsStore, this.handleTrigger.bind(this));
  }
  handleTrigger(data, type) {
    switch(type) {
      case 'saveOptionsSuccess':
        let options = this.state.options;
        if(this.state.options.ldap_on === '0') {
          options.ldap_on = '0';
          this.setState({options});
          this.syncWindowOptions(options);
          TipAction.success('关闭成功');
        }else{
          options.ldap_on = '1';
          this.setState({
            options,
            step: 0
          });
          this.syncWindowOptions(options);
          TipAction.success('操作成功');
        }
        break;
    }
  }
  handleValidSubmit(values) {
    const data = {
      ldap_on: '1',
      ...values
    }

    this.setState({
      submitting: true,
      options: {
          ...this.state.options,
          ...data,
      }
    });
    OptionsAction.save(data);
  }
  closeLdap() {
    return ModalAction.confirm('提示', <div className="center">确定关闭吗？<br /><br />
      <p className="gray">关闭后，白名单内账号登录操作无影响，管理员账号可进行用户的增删改密码重置；</p>
      <p className="gray">已登录过的LDAP账号所有数据均保留，但是密码不正确，需要用户找回密码或者白名单内管理员账号重置密码；</p>
      <p className="gray">关闭后，可再次打开LDAP服务，系统自动保存上次配置。</p></div>, () => {
       OptionsAction.save({ldap_on: '0'});
       this.setState({
        step: 1,
        options: {
          ...this.state.options,
          ldap_on: '0'
        }
       });
    }, 'modal-sm');
  }
  changeLdap() {
    this.updateStep(2);
  }
  syncWindowOptions(options) {
    window.SysConfig.options = options;
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
      <p>LDAP服务已开启</p>
      <br />
      <button type="submit" className="btn btn-primary" onClick={this.closeLdap.bind(this)}>关闭LDAP</button>
      <br />
      <br />
      <button type="submit" className="btn btn-primary" onClick={this.changeLdap.bind(this)}>更新LDAP配置</button>
    </div>);
  }
  step1() {
    return (<div>
      <p>LDAP是Light weight Directory Access Protocol（轻量级目录访问协议）的缩写。</p>
      <p>LDAP可以为各种应用系统提供一个标准的认证机制，所有系统就可以不再用独有的用户管理方法， 而是通过这种统一的认证机制进行用户认证，这样就解决了目前很多企业遇到的多平台软件管理时，身份认证的不统一和不安全的问题。</p>
      <p>开启LDAP服务后，该平台可以使用LDAP账号密码登录系统后台；</p>
      <p>
        此时后台管理员不能进行用户的<code>新增</code>、<code>删除</code>、<code>密码修改</code>操作，
        这些均由LDAP统一管理，每次登录更新该用户最新的用户数据到平台；平台可编辑用户的“用户组”、“状态”。
      </p>
      <div className="alert alert-warning" role="alert">
      如果在系统使用一段时间后开启LDAP服务，若登录用户名已存在则更新用户数据，文章等数据保持不变；如登录用户不存在，则平台会用LDAP账号信息新建账号
      </div>
      <button type="submit" className="btn btn-primary" onClick={this.updateStep.bind(this, 2)}>下一步</button>
    </div>);
  }
  step2() {
    return (<div>
      <p>LDAP服务，需要填写以下信息</p>
      <Form
        className="clearfix"
        model={this.state.options}
        onValidSubmit={this.handleValidSubmit.bind(this)}
        onInvalidSubmit={this.handleInvalidSubmit.bind(this)}
        >
        <br />
        <div className="form-group" style={{width: '512px'}}>
          <label>LDAP URL</label>
          <ValidatedInput
            type='text'
            validate="required"
            errorHelp={{
              required: '填写 LDAP URL'
            }}
            placeholder="ldap://xxx.xxx.xxx.xxx:xx"
            name='ldap_url'
            ref="ldap_url"
            help={<span>待连接的LDAP地址</span>}
          />
        </div>
        <div className="form-group" style={{width: '512px'}}>
          <label>LDAP 连接超时时间(单位：ms)</label>
          <ValidatedInput
            type='text'
            validate="required,isNumeric"
            errorHelp={{
              required: '填写 LDAP 连接超时时间',
              isNumeric: '只能填写数字'
            }}
            placeholder="5000"
            defaultValue="5000"
            name='ldap_connect_timeout'
            ref="ldap_connect_timeout"
          />
        </div>
        <div className="form-group" style={{width: '512px'}}>
          <label>LDAP baseDn</label>
          <ValidatedInput
            type='text'
            validate="required"
            errorHelp={{
              required: '填写 LDAP baseDn'
            }}
            placeholder="dc=xxx,dc=xxx,dc=com"
            name='ldap_baseDn'
            ref="ldap_baseDn"
          />
        </div>
        <div className="form-group" style={{width: '512px'}}>
          <label>LDAP 个人信息修改页地址</label>
          <ValidatedInput
            type='text'
            validate="isURL"
            errorHelp={{
                isURL: '填写正确的URL'
            }}
            placeholder="http://xxx.xx.xx"
            name='ldap_user_page'
            ref="ldap_user_page"
            help={<span>该项配置后，用户能点击链接跳转到该配置页，快捷修改用户个人信息</span>}
          />
        </div>
        <div className="form-group" style={{width: '512px'}}>
          <label>LDAP 白名单</label>
          <ValidatedInput
            type='text'
            placeholder="admin"
            name='ldap_whiteList'
            ref="ldap_whiteList"
            help={<span>名单中的的用户名不通过LDAP登录，例如平台初始管理员，直接使用博客平台用户数据，多个用户名用英文“<code>,</code> ”隔开</span>}
          />
        </div>
        <div className="form-group" style={{width: '512px'}}>
          <label>是否打开 LDAP 日志开关</label>
          <RadioGroup
                defaultValue="1"
                name="ldap_log"
                help={<span>打开开关，后台打印LDAP操作日志</span>}
            >
              <Radio value="1" label="是" />
              <Radio value="0" label="否" />
            </RadioGroup>
        </div>
        <button type="submit" className="btn btn-primary">确定</button>
        <hr />
      </Form>
      <div>{this.state.errmsg}</div>
    </div>)
  }
  getContent() {
    if(this.state.options.ldap_on && this.state.options.ldap_on === '1' && this.state.step === 0) {
      return this.step0();
    }
    switch(this.state.step) {
      case 1:
        return this.step1();
      case 2:
        return this.step2();
    }
  }
  render() {
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <div className="options-2fa">
            <h3 style={{marginBottom: '20px'}}>LDAP服务</h3>
            {this.getContent()}
          </div>
        </div>
      </div>
    );
  }
}
