import React from 'react';
import { Form, ValidatedInput } from 'react-bootstrap-validation';

import OptionsAction from '../action/options';
import OptionsStore from '../store/options';
import Base from 'base';
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
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <h3 style={{marginBottom: '20px'}}>网站统计代码</h3>
          <Form
          className="clearfix options-general"
          onValidSubmit={this.handleValidSubmit.bind(this)}
          onInvalidSubmit={this.handleInvalidSubmit.bind(this)}
          >
            <div className="form-group">
              <ValidatedInput
                  type="textarea"
                  name="analyze_code"
                  {...this.getProps('analyze_code')}
                  ref="analyze_code"
                  className="form-control"
                  style={{height: 240}}
              />
              <p>直接贴入百度统计或者 Google 统计代码</p>
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
