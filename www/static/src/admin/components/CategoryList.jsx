import React from 'react';
import autobind from 'autobind-decorator';
import {Link, Navigation as RouteNavigation } from 'react-router';
import {decorate as mixin} from 'react-mixin';

import BaseListComponent from './BaseListComponent';
import AlertActions from '../actions/AlertActions';
import CategoryActions from '../actions/CategoryActions';
import {CategoryListStore} from '../stores/CategoryStores';

let cacheName = '';

@autobind
@mixin(RouteNavigation)
class CategoryList extends BaseListComponent {

  componentDidMount() {
    CategoryActions.load();

    this.subscribe(
        CategoryListStore.listen(this.onListChange)
    );
  }

  render() {
    let trs = this.state.list.map((item, index) => item.id == 0 ? (
      <tr key={item.id}>
        <td className="colCheck">
          <input type="checkbox" disabled={true} />
        </td>
        <td className="colTitle">{item.name}</td>
        <td className="colTitle">{item.count}</td>
        <td className="colAction">
          <i className="fa fa-pencil-square-o edit disabled" title="编辑" />
          <i className="fa fa-trash-o delete disabled" title="删除" />
        </td>
      </tr>
    ) : (
      <tr key={item.id}>
        <td className="colCheck" onClick={this.handleSelect.bind(this, item.id)}>
          <input type="checkbox" title="选择" checked={this.state.selected.includes(item.id)} readOnly />
        </td>
        <td className="colTitle">
          <input value={item.name} disabled={!item.edit} ref={index} className={item.edit ? 'edit': ''} onChange={this.handleEditChange.bind(this, index, null)} onKeyUp={this.handleEditKeyUp.bind(this, item.id, index)} />
        </td>
        <td className="colTitle">{item.count}</td>
        <td className="colAction">
          <i className={item.edit ? 'none fa fa-pencil-square-o edit': 'block fa fa-pencil-square-o edit'} title="编辑" onClick={this.handleEditState.bind(this, item.id, index)} />
          <i className={item.edit ? 'block fa fa-floppy-o delete': 'none fa fa-floppy-o delete'} title="保存" onClick={this.handleEditSend.bind(this, item.id, index)} />
          <i className="fa fa-trash-o delete" title="删除" onClick={this.handleDelete.bind(this, item.id)} />
        </td>
      </tr>
    ));
    return (
      <div className="CategoryList">
        <table>
          <colgroup>
            <col className="colCheck" />
            <col className="colTitle" />
            <col className="colCount" />
            <col className="colAction" />
          </colgroup>
          <thead>
            <tr>
              <th className="colCheck" onClick={this.handleSelectAll}>
                <input type="checkbox" title="全选" checked={this.state.list.length == this.state.selected.length} readOnly />
              </th>
              <th className="colTitle">分类名</th>
              <th className="colCount">文章数</th>
              <th className="colAction">操作</th>
            </tr>
          </thead>
          <tbody>
            {trs}
          </tbody>
        </table>
        <div className="button-wrapper">
          <button className="button red small" onClick={this.handleDelete}><i className="fa fa-trash-o"></i>批量删除</button>
        </div>
      </div>
    );
  }

  // 设置编辑状态 - 编辑分类
  handleEditState(id, index) {
    // PS：感觉这种写法超级烂，求大神指点
    for (let item of this.state.list) {
      item.edit = false;
    }
    this.state.list[index].edit = true;
    cacheName = this.state.list[index].name;

    // 重置数据
    this.setState({list: this.state.list});

    setTimeout(function () { // 实属无奈之举 如有问题请联系博文 PS：求大神给解决办法~
      React.findDOMNode(this.refs[index]).focus();
    }.bind(this), 30);
  }

  // 取消编辑状态 - 编辑分类
  handleUnEditState (index) {
    this.state.list[index].edit = false;
    this.setState({list: this.state.list});
  }

  // 编辑数据 - 编辑分类
  handleEditChange (index, text) {
    this.state.list[index].name = text ? text : this.refs[index].getDOMNode().value;
    this.setState({list: this.state.list});
  }

  // 发送请求 - 编辑分类
  handleEditSend (id, index) {
    let data = this.state.list[index];
    CategoryActions.update( id, data );

    // 取消编辑状态 - 编辑分类
    this.handleUnEditState(index);
  }

  // Enter键修改 - 编辑分类
  handleEditKeyUp (id, index, e) {
    
    // 发送请求
    if (e.keyCode === 13) this.handleEditSend(id, index);

    // 取消编辑状态
    if (e.keyCode === 27) {
      this.handleUnEditState(index);

      this.handleEditChange(index, cacheName);
      cacheName = '';
    }
  }

  handleDelete(id) {
    if (!confirm('确定要删除？')) return;

    let ids;

    if (Number.isInteger(id)) {
      ids = [id];
    } else {
      ids = this.state.selected;
    }

    if (!ids.length) {
      AlertActions.warning('请勾选要删除的分类');
    } else {
      CategoryActions.delete(ids);
      this.clearList(ids);
    }

  }

}

export default CategoryList;