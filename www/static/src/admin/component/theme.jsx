import Base from 'base';
import React from 'react';
import BreadCrumb from './breadcrumb';
import TipAction from 'common/action/tip';
import ThemeStore from 'admin/store/theme';
import ThemeAction from 'admin/action/theme';
import {Form} from 'react-bootstrap-validation';

export default class extends Base {
  state = this.initialState();
  initialState() {
    return {
      list: [],
      theme: window.SysConfig.options.theme || 'firekylin'
    }
  };

  componentWillMount() {
    this.listenTo(ThemeStore, this.handleTrigger.bind(this));
    ThemeAction.list();
  }

  handleTrigger(data, type) {
    switch (type) {
      case 'getThemeSuccess':
        this.setState({list: data});
        break;
      case 'saveThemeSuccess':
        TipAction.success('设置成功');
        break;
    }
  }

  onValidSubmit() {
    window.SysConfig.options.theme = this.state.theme;
    ThemeAction.save(this.state.theme);
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
        </div>
      </div>
    )
  }
}
