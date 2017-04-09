import React from 'react';
import ReactDOM from 'react-dom';
import { Form, ValidatedInput } from 'react-bootstrap-validation';
import OptionsAction from '../action/options';
import OptionsStore from '../store/options';
import Base from 'base';
import firekylin from 'common/util/firekylin';
import BreadCrumb from 'admin/component/breadcrumb';
import TipAction from 'common/action/tip';

module.exports = class extends Base {
  constructor(props) {
    super(props);
    this.state = {
      submitting: false,
      options: window.SysConfig.options
    };
    if(!this.state.options.hasOwnProperty('push')) {
      this.state.options.push = '0';
    }
    this.state.options.analyze_code = unescape(window.SysConfig.options.analyze_code);
    //网站地址
    if(!this.state.options.site_url) {
      this.state.options.site_url = location.protocol + '//' + location.host;
    }
  }
  componentDidMount() {
    this.listenTo(OptionsStore, this.handleTrigger.bind(this));
  }
  handleTrigger(data, type) {
    switch(type) {
      case 'saveOptionsSuccess':
        this.setState({submitting: false});
        TipAction.success('更新成功');
        for(let key in this.optionsSavedValue) {
          window.SysConfig.options[key] = this.optionsSavedValue[key];
        }
        break;
    }
  }
  changeInput(type, event) {
    let value = event.target.value;
    let options = this.state.options;
    options[type] = value;
    this.setState({options: options});
  }
  getProps(name) {
    let props = {
      value: this.state.options[name] || '',
      onChange: this.changeInput.bind(this, name)
    }
    if(['title', 'description'].indexOf(name) > -1) {
      props.validate = 'required'
    }
    return props;
  }
  handleValidSubmit(values) {
    this.setState({submitting: true});
    this.optionsSavedValue = values;
    OptionsAction.save(values);
  }
  handleInvalidSubmit() {

  }
  render() {
    let BtnProps = {}
    if(this.state.submitting) {
      BtnProps.disabled = true;
    }

    let logoUrl = this.state.options.logo_url;
    let iconUrl = this.state.options.favicon_url;
    if(logoUrl && !logoUrl.includes('data:image')) {
      logoUrl += (logoUrl.includes('?') ? '&' : '?') + 'm=' + Date.now();
    }

    if(iconUrl) {
      iconUrl += (iconUrl.includes('?') ? '&' : '?') + 'm=' + Date.now();
    }

    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <h3 style={{marginBottom: '20px'}}>基本设置</h3>
          <Form
          className="clearfix options-general"
          onValidSubmit={this.handleValidSubmit.bind(this)}
          onInvalidSubmit={this.handleInvalidSubmit.bind(this)}
          >
            <div className="form-group">
              <label>站点名称</label>
              <ValidatedInput
                type="text"
                name="title"
                ref="title"
                {...this.getProps('title')}
                className="form-control"
                errorHelp={{
                  required: '请填写站点名称',
                }}
              />
            </div>
            <div className="form-group">
              <label>LOGO 地址</label>
              {logoUrl ?
                <img src={logoUrl} width="140px" height="140px" alt="logo"
                  style={{display: 'block', marginBottom: '10px'}}/> : null}
              <ValidatedInput
                type="text"
                name="logo_url"
                {...this.getProps('logo_url')}
                ref="logo_url"
                className="form-control"
              />
              <p className="help-block">
                尺寸最好为 140x140px。
                <button type="button" className="btn btn-default"
                  onClick={()=> ReactDOM.findDOMNode(this.refs.logoInput).click()}>
                  {this.state.logo_uploading?'正在':''}上传
                </button>
                <input
                    type="file"
                    ref="logoInput"
                    style={{display: 'none'}}
                    accept="image/*"
                    onChange={e=> {
                      let file = e.target.files[0];
                      if(!file) {
                        return false;
                      }
                      this.state.options.logo_url = '';
                      this.setState({logo_uploading: true}, ()=> {
                        var form = new FormData();
                        form.append('file', file);
                        form.append('name', 'logo');
                        firekylin.upload(form).then(
                          res => {
                            this.state.options.logo_url = res.data;
                            this.state.logo_uploading = false;
                            this.forceUpdate();
                          }
                        );

                      });
                    }}
                />
              </p>
            </div>
            <div className="form-group">
              <label>站点描述</label>
              <ValidatedInput
                type="text"
                name="description"
                {...this.getProps('description')}
                ref="description"
                className="form-control"
                errorHelp={{
                  required: '请填写站点描述'
                }}
              />
            </div>
            <div className="form-group">
              <label>网站地址</label>
              <ValidatedInput
                type="text"
                name="site_url"
                {...this.getProps('site_url')}
                ref="site_url"
                className="form-control"
                errorHelp={{
                  required: '请填写网站地址'
                }}
              />
            </div>
            <div className="form-group">
              <label>Favicon 地址</label>
              {iconUrl ? <img src={iconUrl} alt="logo"
                style={{display: 'block', marginBottom: '10px', maxWidth: '128px', maxHeight: '128px'}}/> : null}
              <ValidatedInput
                type="text"
                name="favicon_url"
                {...this.getProps('favicon_url')}
                ref="favicon_url"
                className="form-control"
              />
              <p className="help-block">
                尺寸最好为 128x128px。
                <button type="button" className="btn btn-default"
                  onClick={()=> ReactDOM.findDOMNode(this.refs.faviconInput).click()}>
                  {this.state.favicon_uploading?'正在':''}上传
                </button>
                <input
                    type="file"
                    ref="faviconInput"
                    style={{display: 'none'}}
                    accept="image/x-icon"
                    onChange={e=> {
                      let file = e.target.files[0];
                      if(!file) {
                        return false;
                      }
                      this.state.options.favicon_url = '';
                      this.setState({favicon_uploading: true}, ()=> {
                        var form = new FormData();
                        form.append('file', file);
                        form.append('name', 'favicon');
                        firekylin.upload(form).then(
                          res => {
                            this.state.options.favicon_url = res.data;
                            this.state.favicon_uploading = false;
                            this.forceUpdate();
                          }
                        );

                      });
                    }}
                />
              </p>
            </div>
            <div className="form-group">
              <label>关键词</label>
              <ValidatedInput
                type="text"
                name="keywords"
                {...this.getProps('keywords')}
                ref="keywords"
                className="form-control"
                errorHelp={{
                  required: '请填写站点关键词'
                }}
              />
              <p className="help-block">请以半角逗号 "," 分割多个关键字.</p>
            </div>
            <div className="form-group">
              <label>GitHub 地址</label>
              <ValidatedInput
                type="text"
                name="github_url"
                {...this.getProps('github_url')}
                ref="github_url"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Twitter 地址</label>
              <ValidatedInput
                type="text"
                name="twitter_url"
                {...this.getProps('twitter_url')}
                ref="twitter_url"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>网站工信部备案号</label>
              <ValidatedInput
                type="text"
                name="miitbeian"
                {...this.getProps('miitbeian')}
                ref="miitbeian"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>网站公安部备案号</label>
              <ValidatedInput
                type="text"
                name="mpsbeian"
                {...this.getProps('mpsbeian')}
                ref="miitbeian"
                className="form-control"
              />
            </div>
            <button type="submit" {...BtnProps} className="btn btn-primary">
              {this.state.submitting ? '提交中...' : '提交'}
            </button>
          </Form>
        </div>
      </div>
    );
  }
}
