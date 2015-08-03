import React from 'react';
import autobind from 'autobind-decorator';
import {Link, Navigation} from 'react-router';
import {decorate as mixin} from 'react-mixin';

import BaseListComponent from './BaseListComponent';
import AlertActions from '../actions/AlertActions';
import CategoryActions from '../actions/CategoryActions';
import {CategoryListStore} from '../stores/CategoryStores';


@autobind
@mixin(Navigation)
class CategoryList extends BaseListComponent {

  componentDidMount() {
    CategoryActions.load();

    this.subscribe(
        CategoryListStore.listen(this.onListChange)
    );
  }

  render() {
    let trs = this.state.list.map(item => item.id == 0 ? (
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
        <td className="colTitle">{item.name}</td>
        <td className="colTitle">{item.count}</td>
        <td className="colAction">
          <i className="fa fa-pencil-square-o edit" title="编辑" onClick={this.handleEdit.bind(this, item.id)} />
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

  handleEdit(id) {
    this.transitionTo('post/edit', {id});
  }

  handleDelete(id) {
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
    }

  }

}

export default CategoryList;