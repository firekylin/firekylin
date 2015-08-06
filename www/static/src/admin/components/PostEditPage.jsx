import React from 'react';
import {Navigation} from 'react-router';
import autobind from 'autobind-decorator';
import {decorate as mixin} from 'react-mixin';

import BaseComponent from './BaseComponent';
import AlertActions from '../actions/AlertActions';
import PostActions from '../actions/PostActions';
import CategoryActions from '../actions/CategoryActions';
import {PostStatusStore, PostStore} from '../stores/PostStores';
import {CategoryListStore} from '../stores/CategoryStores';

import Editor from  '../../common/markdown-editor';


const ADD_CATEGORY = "{add}";

@autobind
@mixin(Navigation)
class PostAddPage extends BaseComponent {
  constructor(props) {
    super(props);

    this.state = {
      status: '',
      categories: [],
      title: '',
      content: '',
      category: 0
    };

    this.id = this.props.params.id;
    this.new = !this.id;
  }

  componentDidMount() {
    CategoryActions.load();
    this.new || PostActions.load(this.id);


    this.editor = new Editor({
      element: this.refs.editor.getDOMNode()
    });

    window.onbeforeunload = function() {
      return this.checkUnload() ? '正在编辑中，未保存的部分可能会丢失\n' : undefined;
    }.bind(this);

    this.subscribe(
        CategoryListStore.listen(this.onCategoryChange),
        PostStatusStore.listen(this.onPostStatusChange),
        PostStore.listen(this.onPostChange)
    );
  }

  componentWillUnmount() {
    super.componentWillUnmount();

    window.onbeforeunload = function(){};
  }

  componentDidUpdate() {
    this.editor.value(this.state.content);
  }

  render() {

    let title = this.new ? '添加文章' : '编辑文章';
    let categories = this.state.categories.map((category) => (
        <option key={category.id} value={category.id}>{category.name}</option>
    ));

    return (
        <div className="PostEditPage page">
          <div className="title">
            <h2>{title}</h2>
          </div>
          <div className="title-wrapper">
            <input type="text" placeholder="请输入标题" ref="title" value={this.state.title} onChange={this.handleTitleChange} />
          </div>
          <div className="category-wrapper">
            <select ref="category" value={ this.state.category } onChange={this.handleCategoryChange}>
              { categories }
              <option value={ false } disabled>---</option>
              <option value={ ADD_CATEGORY }>添加新分类</option>
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

  handleTitleChange(e) {
    let value = e.target.value;
    this.setState({
      title: value
    });
  }

  handleCategoryChange(e) {
    let value = e.target.value;
    this.setState({
      category: value,
      showAddCategory: value == ADD_CATEGORY
    });
  }

  handleSave() {
    let title = this.refs.title.getDOMNode().value;
    let category = this.refs.category.getDOMNode().value;
    let content = this.editor.value();
    let data = {title, content};

    if (!title) {
      return AlertActions.warning('请填写标题');
    } else if (!category) {
      return AlertActions.warning('请选择分类');
    }

    if (category == ADD_CATEGORY) {
      let newCategory = this.refs.newCategory.getDOMNode().value;
      data['newCategory'] = newCategory;
    } else {
      data['category'] = category
    }

    if (this.new) {
      PostActions.add(data);
    } else {
      PostActions.update(this.id, data);
    }
  }

  handleBack() {
    this.transitionTo('post');
  }

  checkUnload() {
    return !!this.editor.value();
  }

  onCategoryChange(categories) {
    this.setState({ categories })
  }

  onPostStatusChange(status) {
    let type = this.new ? '发布' : '修改';

    if (status == 'complete') {
      AlertActions.success(type + '成功');
      this.transitionTo('post');
    } else {
      AlertActions.error(type + '失败');
    }
  }

  onPostChange(post) {
    this.setState({
      title: post.title,
      content: post.content,
      category: post.category
    });
  }
}

export default PostAddPage;