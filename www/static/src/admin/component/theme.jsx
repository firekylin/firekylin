import Base from 'base';
import React from 'react';
import BreadCrumb from './breadcrumb';
import TipAction from 'common/action/tip';
import ThemeStore from 'admin/store/theme';
import ThemeAction from 'admin/action/theme';
import {Form, ValidatedInput} from 'react-bootstrap-validation';

export default class extends Base {
  state = this.initialState();
  initialState() {
    return {
      list: [],
      themeConfig: {},
      theme: window.SysConfig.options.theme || 'firekylin'
    }
  };

  componentWillMount() {
    this.listenTo(ThemeStore, this.handleTrigger.bind(this));
    ThemeAction.list();
    this.state.themeConfig = {};
    if( window.SysConfig.options.themeConfig ) {
      try{
        this.state.themeConfig = JSON.parse(window.SysConfig.options.themeConfig);
      } catch(e) { console.log(e) }
    }
  }

  handleTrigger(data, type) {
    switch (type) {
      case 'getThemeSuccess':
        this.setState({list: data});
        break;
      case 'saveThemeSuccess':
      case 'saveThemeConfigSuccess':
        TipAction.success('设置成功');
        break;
    }
  }

  onValidSubmit() {
    window.SysConfig.options.theme = this.state.theme;
    ThemeAction.save(this.state.theme);
  }

  saveThemeConfig(vals) {
    let data = Object.assign({}, this.state.themeConfig, vals);
    window.SysConfig.options.themeConfig = data;
    ThemeAction.saveThemeConfig(data);
  }

  renderConfigElement(element, i) {
    switch(element.type) {
      case 'url':
      case 'text':
      case 'email':
      case 'textarea':
      case 'password':
        return (<ValidatedInput {...element} key={i}/>);
        break;

      case 'radio':
        if(!Array.isArray(element.options)) { return null; }

        return (
          <RadioGroup {...element} key={i}>
            {element.options.map((opt,j) => <Radio {...opt} key={j} />)}
          </RadioGroup>
        );
        break;

      case 'select':
        if(!Array.isArray(element.options)) { return null; }

        return (
          <div className="form-group" key={i}>
            <label>{element.label}</label>
            <div>
              <select
                  name={element.name}
                  className="form-control"
                  value={this.state.themeConfig[element.name]}
                  onChange={e => {
                    this.state.themeConfig[element.name] = e.target.value;
                    this.forceUpdate();
                  }}
              >
                {element.options.map((opt, j) =>
                  <option key={j} value={opt.value ? opt.value : opt}>{opt.label ? opt.label : opt}</option>
                )}
              </select>
              <div className="help-block">{element.help ? element.help : ''}</div>
            </div>
          </div>
        );
        break;
    }
  }

  renderThemeConfig() {
    if( this.state.list.length === 0 ) {
      return null;
    }

    let theme = this.state.list.filter(theme => theme.id === this.state.theme)[0];
    if( !theme.configElements || !Array.isArray(theme.configElements) ) {
      return null;
    }


    return (
      <div>
        <h3 style={{marginBottom: '20px'}}>{theme.name} 主题选项</h3>
        <Form
            model={this.state.themeConfig}
            className="clearfix options-general"
            onValidSubmit={this.saveThemeConfig.bind(this)}
        >
          {theme.configElements.map(this.renderConfigElement.bind(this))}
          <button type="submit" className="btn btn-primary">保存配置</button>
        </Form>
      </div>
    )
  }
  render() {
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <h3 style={{marginBottom: '20px'}}>主题设置</h3>
          <Form
            className="clearfix options-general"
            onValidSubmit={this.onValidSubmit.bind(this)}
          >
            <div className="form-group">
              <label>主题选择：</label>
              <div>
                <select
                    className="form-control"
                    value={this.state.theme}
                    onChange={e => this.setState({theme: e.target.value})}
                >
                  {this.state.list.map((opt, i) =>
                    <option key={i} value={opt.id}>{opt.name} - {opt.version}</option>
                  )}
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">提交</button>
          </Form>
          {this.renderThemeConfig()}
        </div>
      </div>
    )
  }
}
