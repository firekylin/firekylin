import React from 'react';
import {Navigation} from 'react-router';
import autobind from 'autobind-decorator';
import {decorate as mixin} from 'react-mixin';

import PostAction from '../actions/PostAction';
import CategoryAction from '../actions/CategoryAction';
import {NewPostStore} from '../stores/PostStores';
import {CategoryListStore} from '../stores/CategoryStores';

import Editor from  '../../common/markdown-editor';


const ADD_CATEGORY = "{add}";

@autobind
@mixin(Navigation)
class PostAddPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      status: '',
      categories: []
    };

    this.subscribes = [];
  }

  componentDidMount() {
    CategoryAction.load();

    this.editor = new Editor({
      element: this.refs.editor.getDOMNode()
    });

    window.onbeforeunload = function() {
      return this.checkUnload() ? '正在编辑中，未保存的部分可能会丢失\n' : undefined;
    }.bind(this);

    this.subscribes.push(
        CategoryListStore.listen(this.onCategoryChange),
        NewPostStore.listen(this.onPostStatusChange)
    );
  }

  componentWillUnmount() {
    window.onbeforeunload = function(){};
    this.unsubscribe();
  }

  render() {

    let categories = this.state.categories.map((category) => (
        <option key={category.id} value={category.id}>{category.name}</option>
    ));

    return (
        <div className="PostAddPage page">
          <div className="title-wrapper">
            <input type="text" placeholder="请输入标题" ref="title" />
          </div>
          <div className="category-wrapper">
            <select ref="category" onChange={this.handleCategoryChange}>
              <option value={false}>请选择分类</option>
              <option value={ADD_CATEGORY}>添加新分类</option>
              <option value={false} disabled>---</option>
              {categories}
            </select>
            <div className="add-category" style={{display: this.state.showAddCategory ? 'inline-block' : 'none'}}>
              <input placeholder="请输入分类名" ref="newCategory" />
            </div>
          </div>
          <div className="editor-wrapper">
            <textarea className="editor" ref="editor" />
          </div>
          <div className="editor-status">{this.state.status}</div>
          <div className="button-wrapper">
            <button className="button blue" onClick={this.handleSave}>保存</button>
            <button className="button white" onClick={this.handleBack}>返回</button>
          </div>
        </div>
    )
  }

  unsubscribe() {
    this.subscribes.forEach(func => func());
  }

  handleSave() {
    let title = this.refs.title.getDOMNode().value;
    let category = this.refs.category.getDOMNode().value;
    let content = this.editor.value();
    let data = {title, content};

    if (category == ADD_CATEGORY) {
      let newCategory = this.refs.newCategory.getDOMNode().value;
      data['newCategory'] = newCategory;
    } else {
      data['category'] = category
    }

    PostAction.add(data);
  }

  handleBack() {
    this.transitionTo('post');
  }

  handleCategoryChange(event) {
    this.setState({
      showAddCategory: event.target.value == ADD_CATEGORY
    })
  }

  checkUnload() {
    return !!this.editor.value();
  }

  onCategoryChange(categories) {
    this.setState({ categories })
  }

  onPostStatusChange(status) {
    if (status == 'complete') {
      alert('发布成功');
      this.transitionTo('post');
    } else {
      alert('发布失败');
    }
  }
}

export default PostAddPage;