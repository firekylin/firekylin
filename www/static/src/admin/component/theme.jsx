import React from 'react';
import CodeMirror from 'react-codemirror';
import { SketchPicker } from 'react-color';
import { Form, ValidatedInput, Radio, RadioGroup } from 'react-bootstrap-validation';
import BreadCrumb from './breadcrumb';
import Base from 'base';
import TipAction from 'common/action/tip';
import ThemeStore from 'admin/store/theme';
import ThemeAction from 'admin/action/theme';

import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/mode/css/css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/htmlmixed/htmlmixed';


module.exports = class extends Base {
  state = this.initialState();
  initialState() {
    return {
      list: [],
      themeConfig: {},
      theme: window.SysConfig.options.theme || 'firekylin'
    }
  }

  componentWillMount() {
    this.listenTo(ThemeStore, this.handleTrigger.bind(this));
    ThemeAction.list();
    this.state.themeConfig = {};

    let themeConfig = window.SysConfig.options.themeConfig;
    try {
      if(!themeConfig) {
        return;
      }
      if(typeof(themeConfig) === 'string') {
        themeConfig = JSON.parse(themeConfig);
      }
      this.state.themeConfig = themeConfig;
    } catch(e) { /* JSON Parse Error */ }
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
    if(element.type === 'html') {
      element.type = 'htmlmixed';
    }

    switch(element.type) {
      case 'url':
      case 'text':
      case 'email':
      case 'textarea':
      case 'password':
        return (<ValidatedInput {...element} key={i}/>);

      case 'radio':
        if(!Array.isArray(element.options)) { return null; }

        return (
          <RadioGroup {...element} key={i}>
            {element.options.map((opt, j) => <Radio {...opt} key={j} />)}
          </RadioGroup>
        );

      case 'checkbox':
        if(!Array.isArray(element.options)) { return null; }

        return (
          <div className="form-group" key={i}>
            <label>{element.label}</label>
            <div>
              {element.options.map((opt, j) =>
                <label>
                  <input
                      key={j}
                      type="checkbox"
                      className="form-control"
                      name={'element.name[]'}
                      value={opt.value ? opt.value : opt}
                      checked={Array.isArray(this.state.themeConfig[element.name]) &&
                        this.state.themeConfig[element.name].includes(opt.value || opt)}
                      onChange={e => {
                        let checked = e.target.checked;
                        let val = opt.value ? opt.value : opt;
                        if(Array.isArray(this.state.themeConfig[element.name])) {
                          if(checked) {
                            this.state.themeConfig[element.name].push(val);
                          } else {
                            this.state.themeConfig[element.name] =
                              this.state.themeConfig[element.name].filter(v => v !== val);
                          }
                        } else {
                          this.state.themeConfig[element.name] = [val];
                        }
                        return this.forceUpdate();
                      }}
                  />
                  {opt.label ? opt.label : opt}
                </label>
              )}
            </div>
          </div>
        );

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

      case 'color':
        return (
          <div className="form-group react-color-picker" key={i}>
            <label>{element.label}</label>
            <div>
               <div className="swatch" onClick={ ()=> this.setState({[`display${element.name}`]: !this.state[`display${element.name}`]}) }>
                <div className="color" style={{backgroundColor: this.state.themeConfig[element.name]}}/>
              </div>
              { this.state[`display${element.name}`] ? <div className="popover-color">
                <div className="cover" onClick={ ()=> this.setState({[`display${element.name}`]: false}) }/>
                <SketchPicker color={ this.state.themeConfig[element.name] } onChangeComplete={color => {
                  this.state.themeConfig[element.name] = color.hex;
                  this.forceUpdate();
                }} />
              </div> : null }
            </div>
          </div>
        );

      case 'css':
      case 'htmlmixed':
      case 'javascript':
        return (
          <div className="form-group" key={i}>
            <label>{element.label}</label>
            <div>
              <CodeMirror
                  options={{
                    theme: 'monokai',
                    lineNumbers: true,
                    mode: element.type
                  }}
                  value={this.state.themeConfig[element.name]}
                  onChange={val => {
                    this.state.themeConfig[element.name] = val;
                    this.forceUpdate();
                  }}
              />

              <div className="help-block">{element.help ? element.help : ''}</div>
            </div>
          </div>
        );
    }
  }

  renderThemeConfig() {
    if(this.state.list.length === 0) {
      return null;
    }

    let theme = this.state.list.filter(theme => theme.id === this.state.theme)[0];
    if(!theme.configElements || !Array.isArray(theme.configElements)) {
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
