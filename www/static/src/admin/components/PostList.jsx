import React from 'react';
import autobind from 'autobind-decorator';
import {Link, Navigation} from 'react-router';
import {decorate as mixin} from 'react-mixin';

import BaseListComponent from './BaseListComponent';
import AlertActions from '../actions/AlertActions';
import PostActions from '../actions/PostActions';
import {PostListStore} from '../stores/PostStores';


@autobind
@mixin(Navigation)
class PostList extends BaseListComponent {

  componentDidMount() {
    PostActions.load();

    this.subscribe(
        PostListStore.listen(this.onListChange)
    );
  }

  render() {
    let trs = this.state.list.map(item => (
      <tr key={item.id}>
        <td className="colCheck" onClick={this.handleSelect.bind(this, item.id)}>
          <input type="checkbox" title="选择" checked={this.state.selected.includes(item.id)} readOnly />
        </td>
        <td className="colTitle">{item.title}</td>
        <td className="colCategory">{item.category}</td>
        <td className="colAuthor">{item.author}</td>
        <td className="colDate">{item.modify_date.format('YYYY-MM-DD HH:mm')}</td>
        <td className="colAction">
          <i className="fa fa-pencil-square-o edit" title="编辑" onClick={this.handleEdit.bind(this, item.id)} />
          <i className="fa fa-trash-o delete" title="删除" onClick={this.handleDelete.bind(this, item.id)} />
        </td>
      </tr>
    ));
    return (
      <div className="PostList">
        <table>
          <colgroup>
            <col className="colCheck" />
            <col className="colTitle" />
            <col className="colCategory" />
            <col className="colAuthor" />
            <col className="colDate" />
            <col className="colAction" />
          </colgroup>
          <thead>
            <tr>
              <th className="colCheck" onClick={this.handleSelectAll}>
                <input type="checkbox" title="全选" checked={this.state.list.length == this.state.selected.length} readOnly />
              </th>
              <th className="colTitle">标题</th>
              <th className="colCategory">分类</th>
              <th className="colAuthor">作者</th>
              <th className="colDate">更新时间</th>
              <th className="colAction">操作</th>
            </tr>
          </thead>
          <tbody>
            {trs}
          </tbody>
        </table>
        <div className="button-wrapper">
          <Link to="/admin/post/add" className="add-post button green small"><i className="fa fa-plus"></i>添加文章</Link>
          <button className="button red small" onClick={this.handleDelete}><i className="fa fa-trash-o"></i>批量删除</button>
        </div>
      </div>
    );
  }

  handleEdit(id) {
    this.transitionTo('/admin/post/edit/' + id);
  }

  handleDelete(id) {
    let ids;

    if (Number.isInteger(id)) {
      ids = [id];
    } else {
      ids = this.state.selected;
    }

    if (!ids.length) {
      AlertActions.warning('请勾选要删除的文章');
    } else {
      PostActions.delete(ids);
    }

  }

}

export default PostList