import React from 'react';
import { Link, History } from 'react-router';
import autobind from 'autobind-decorator';
import {decorate as mixin} from 'react-mixin';

import BaseComponent from './BaseComponent';
import AlertActions from '../actions/AlertActions';
import PostActions from '../actions/PostActions';
import CategoryActions from '../actions/CategoryActions';
import { PostStatusStore, PostStore } from '../stores/PostStores';
import { CategoryListStore } from '../stores/CategoryStores';
import PostAddTags from './PostAddTags';

import Editor from  '../../common/markdown-editor';


const ADD_CATEGORY = "{add}";

@autobind
@mixin(History)
class PostAddPage extends BaseComponent {
  constructor(props) {
    super(props);

    this.state = {
      defaultStatus: '',
      status: '',
      categories: [],
      title: '',
      content: '',
      category: 1
    };

    this.savedStated = {};

    this.id = this.props.params.id;
    this.isNew = !this.id;
    this.isAutoSave = false;
  }

  componentDidMount() {
    let self = this;
    CategoryActions.load();
    this.isNew || PostActions.load(this.id);

    //自动保存
    self.timer = setInterval(function() {
      let state = self.state;
      let savedStated = self.savedStated;
      let tagIds = self.refs.tags.state.tagIds.join('');
      let needSave = (state.category && state.title && state.content) &&
            (state.category != savedStated.category ||
              state.title != savedStated.title ||
              state.content != savedStated.content ||
              tagIds != savedStated.tagIds);

      //重置状态
      self.setState({
        status: ''
      });

      if(needSave) {
        Object.assign(self.savedStated, {
          tagIds: tagIds,
          defaultStatus: state.status,
          title: state.title,
          content: state.content,
          category: state.category
        });
        self.handleSave();
        //设置状态
        self.setState({
          status: '正在保存...'
        });
        self.isAutoSave = true;
      }
    }, 2000);

    this.editor = new Editor({
      element: this.refs.editor.getDOMNode()
    });

    this.editor.codemirror.on('change', cm => {
      this.handleContentChange(cm.getValue());
    });

    window.onbeforeunload = function() {
      return this.isChanged() ? '正在编辑中，未保存的部分可能会丢失\n' : undefined;
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

    //清除状态
    this.clearStatus();
  }

  componentDidUpdate() {
    if (this.editor.value() != this.state.content) {
      this.editor.value(this.state.content);
    }
  }

  routerWillLeave(nextState, router) {
    if (this.isChanged()) {
      if (!confirm('正在编辑中，未保存的部分可能会丢失\n\n确定要离开？')) {
        router.abort();
      }
    }
  }

  render() {
    let title = this.isNew ? '添加文章' : '编辑文章';
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
          <PostAddTags ref="tags"/>
          <div className="button-wrapper">
            <button className="button blue" onClick={this.handleSave} data-status="1">发布</button>
            <button className="button blue" onClick={this.handleSave} data-status="2">保存为草稿</button>
            <Link to="/admin/post" className="button white" >返回</Link>
          </div>
        </div>
    )
  }

  clearStatus() {
    clearInterval(this.timer);
    //需要异步处理，更新数据
    setTimeout(function() {
      PostActions.load(false);
    }, 100);
  }

  handleContentChange(content) {
    this.setState({ content })
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

  handleSave(e) {
    let defaultStatus = this.state.defaultStatus;
    let title = this.refs.title.getDOMNode().value;
    let category = this.refs.category.getDOMNode().value;
    let content = this.editor.value();
    let tags = this.refs.tags.state.tagIds;
    let data = {title, content, tags};
    let status = 2;

    //手动保存进入这个逻辑
    if(e) {
      status = e.target.getAttribute('data-status') == 1 ? 1 : 2;
      this.isAutoSave = false;
    }

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

    data.status = status; //设置文章状态

    if(this.isNew) {
      PostActions.add(data);
      //修改状态
      this.isNew = false;
      this.setState({
        defaultStatus: 2
      });
    }else {
      //发布上线
      if(status == 1) {
        PostActions.update(this.id, data);
      }

      //保存为草稿
      if(status == 2) {
        //本身就是草稿
        if(defaultStatus == 2) {
          PostActions.update(this.id, data);
        }
        //线上文件
        if(defaultStatus == 1) {
          PostActions.add(data);
        }
      }
    }
  }

  isChanged() {
    if (this.isNew) {
      return !!this.editor.value();
    } else {
      return Object.keys(this.savedStated).some(key => this.savedStated[key] != this.state[key]);
    }
  }

  onCategoryChange(categories) {
    this.setState({ categories })
  }

  onPostStatusChange(status) {
    let isAutoSave = this.isAutoSave;
    let type = this.isNew ? '发布' : '修改';

    if(status.action == 'add' || status.action == 'update') {
      var error = status.response;
      if (error && error.errno) {
        AlertActions.error(type + '失败');
      } else {
        if(!isAutoSave) {
          AlertActions.success(type + '成功');
          this.history.pushState(null, '/admin/post');
          this.clearStatus();
        }else{
          //更新id
          this.id = error.data.id;
          this.setState({
            defaultStatus: 2,
            status: '自动保存成功!'
          });
        }
      }
    }
  }

  onPostChange(post) {
    Object.assign(this.savedStated, {
      tagIds: this.refs.tags.state.tagIds.join(''),
      defaultStatus: post.status,
      title: post.title,
      content: post.content,
      category: post.category
    });

    this.setState(this.savedStated);
  }
}

export default PostAddPage;