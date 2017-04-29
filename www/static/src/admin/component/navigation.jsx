import React from 'react';
import {Form, ValidatedInput} from 'react-bootstrap-validation';

import BreadCrumb from './breadcrumb';
import Base from 'base';
import TipAction from 'common/action/tip';
import OptionsStore from 'admin/store/options';
import OptionsAction from 'admin/action/options';

module.exports = class extends Base {
  state = this.initialState();

  initialState() {
    let options = window.SysConfig.options;
    if(!options.navigation) {
      options.navigation = [];
    } else if(typeof(options.navigation) === 'string') {
      options.navigation = JSON.parse(options.navigation);
    }
    return {
      list: options.navigation,
      editingRow: -1,
      editingNav: null
    };
  }

  componentWillMount() {
    this.listenTo(OptionsStore, this.handleTrigger.bind(this));
  }

  handleTrigger(data, type) {
    switch (type) {
      case 'saveNavigationSuccess':
        TipAction.success('更新成功');
        break;
    }
  }

  onValidSubmit(e) {
    this.state.list.push({
      label: e['label-add'],
      url: e['url-add'],
      option: e['option-add']
    });
    this.updateNav();
  }

  updateNav() {
    window.SysConfig.options.navigation = this.state.list;
    OptionsAction.navigation(this.state.list);
    this.forceUpdate();
  }

  move(a, b) {
    let c = this.state.list[a];
    this.state.list[a] = this.state.list[b];
    this.state.list[b] = c;
    if (this.state.editingRow === a) {
      this.state.editingRow = b;
    } else if (this.state.editingRow === b) {
      this.state.editingRow = a;
    }
    this.updateNav();
  }

  edit(idx, nav) {
    this.state.list[idx] = nav;
    this.updateNav();
  }

  normalRow(nav, i) {
    return (
      <tr
        key={i}
        className="fk-dragable-row"
      >
        <td className="fk-dragable-item">
          <span className="glyphicon glyphicon-option-vertical"></span>
        </td>
        <td>{nav.label}</td>
        <td>{nav.url}</td>
        <td>{nav.option}</td>
          <td>
            <button
                type="button"
                disabled={i===0}
                className="btn btn-success btn-xs"
                onClick={()=> this.move(i-1, i)}
            >
              <span className="glyphicon glyphicon-arrow-up"></span>
              <span>上移</span>
            </button>
            <span> </span>
            <button
               type="button"
               disabled={i===this.state.list.length-1}
               className="btn btn-success btn-xs"
               onClick={()=> this.move(i, i+1)}
            >
             <span className="glyphicon glyphicon-arrow-down"></span>
             <span>下移</span>
            </button>
            <span> </span>
            <button
                type="button"
                className="btn btn-primary btn-xs"
                onClick={()=> {
                  this.setState({editingRow: i, editingNav: Object.assign({}, nav)});
                }}
            >
              <span className="glyphicon glyphicon-edit"></span>
              <span>编辑</span>
            </button>
            <span> </span>
            <button
                type="button"
                disabled={this.state.editingRow !== -1}
                className="btn btn-danger btn-xs"
                onClick={()=> {
                  this.state.list.splice(i, 1);
                  this.updateNav();
                }}
            >
              <span className="glyphicon glyphicon-trash"></span>
              <span>删除</span>
            </button>
          </td>
      </tr>
    )
  }

  editingRow(nav, i) {
    return (
      <tr
        key={`editing-${i}`}
        className="fk-dragable-row"
      >
        <td className="fk-dragable-item">
          <span className="glyphicon glyphicon-option-vertical"></span>
        </td>
        <td>
          <ValidatedInput
              type="text"
              name="label-edit"
              validate="required"
              defaultValue={this.state.editingNav.label}
              onChange={e => {
                this.state.editingNav.label = e.target.value;
              }}
          />
        </td>
        <td>
          <ValidatedInput
              type="text"
              name="url-edit"
              validate="required"
              defaultValue={this.state.editingNav.url}
              onChange={e => {
                this.state.editingNav.url = e.target.value;
              }}
          />
        </td>
        <td>
          <ValidatedInput
              type="text"
              name="option-edit"
              defaultValue={this.state.editingNav.option}
              onChange={e => {
                this.state.editingNav.option = e.target.value;
              }}
          />
        </td>
        <td>
          <button
              type="button"
              className="btn btn-primary btn-xs"
              onClick={()=> {
                if (this.state.editingNav.label && this.state.editingNav.url) {
                  this.edit(this.state.editingRow, this.state.editingNav);
                  this.setState({editingRow: -1, editingNav: null});
                }
              }}
          >
            <span className="glyphicon glyphicon-edit"></span>
            <span>保存</span>
          </button>
          <span> </span>
          <button
              type="button"
              className="btn btn-default btn-xs"
              onClick={()=> {
                this.setState({editingRow: -1, editingNav: null});
              }}
          >
            <span className="glyphicon glyphicon-remove"></span>
            <span>取消</span>
          </button>
        </td>
      </tr>
    )
  }

  render() {
    let rows = this.state.list.map((nav, i) =>
      this.state.editingRow !== i ? this.normalRow(nav, i) : this.editingRow(nav, i)
    );
    rows.push(
      <tr key="form">
        <td></td>
        <td>
          <ValidatedInput
              type="text"
              name="label-add"
              validate="required"
          />
        </td>
        <td>
          <ValidatedInput
              type="text"
              name="url-add"
              validate="required"
          />
        </td>
        <td>
          <ValidatedInput
              type="text"
              name="option-add"
          />
        </td>
        <td>
          <button type="submit" className="btn btn-primary btn-xs">
            <span className="glyphicon glyphicon-edit"></span>
            <span>新增</span>
          </button>
        </td>
      </tr>
    );

    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <Form onValidSubmit={this.onValidSubmit.bind(this)}>
            <table className="table table-striped">
              <thead>
                <tr>
                  <th style={{width: 10}}></th>
                  <th>菜单文本</th>
                  <th>菜单地址</th>
                  <th>菜单属性</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody children={rows} />
            </table>
          </Form>
        </div>
      </div>
    )
  }
}
