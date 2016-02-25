import React from 'react';
import ReactDom from 'react-dom';
import Base from '../../common/component/base';
import {Link} from 'react-router';
import classnames from 'classnames';
import { Form, ValidatedInput } from 'react-bootstrap-validation';

import PostAction from '../action/post';
import PostStore from '../store/post';
import CateAction from '../action/cate';
import CateStore from '../store/cate';
import TipAction from '../../common/action/tip';

export default class extends Base {
  constructor(props){
    super(props);
    this.state = {
      submitting: false,
      postInfo: {},
      cateList: []
    }
    this.post_cate = {};
    this.id = this.props.params.id | 0;
  }

  componentWillMount() {
    this.listenTo(PostStore, this.handleTrigger.bind(this));
    this.listenTo(CateStore, cateList => this.setState({cateList}));

    CateAction.select();
    if(this.id){
      PostAction.select(this.id);
    }
  }
  /**
   * hanle trigger
   * @param  {[type]} data [description]
   * @param  {[type]} type [description]
   * @return {[type]}      [description]
   */
  handleTrigger(data, type){
    switch(type){
      case 'savePostFail':
        this.setState({submitting: false});
        break;
      case 'savePostSuccess':
        TipAction.success(this.id ? '保存成功' : '添加成功');
        this.setState({submitting: false});
        setTimeout(() => this.redirect('post/list'), 1000);
        break;
      case 'getPostInfo':
        this.setState({postInfo: data});
        break;
    }
  }
  /**
   * save
   * @return {}       []
   */
  handleValidSubmit(values){
    this.setState({submitting: true});
    if(this.id){
      values.id = this.id;
    }
    values.cate = Object.keys(this.post_cate).filter(item => this.post_cate[item]);
    PostAction.save(values);
  }
  /**
   * render
   * @return {} []
   */
  render(){
    let props = {}
    if(this.state.submitting){
      props.disabled = true;
    }

    return (
      <Form
        model={this.state.postInfo}
        className="post-create clearfix"
        onValidSubmit={this.handleValidSubmit.bind(this)}
      >
        <ValidatedInput
            name="title"
            type="text"
            label="标题"
            labelClassName="col-xs-2"
            wrapperClassName="col-xs-10"
        />
        <ValidatedInput
          name="pathname"
          type="text"
          label="URL"
          labelClassName="col-xs-2"
          wrapperClassName="col-xs-10"
        />
        <ValidatedInput
          name="content"
          type="textarea"
          label="正文"
          labelClassName="col-xs-2"
          wrapperClassName="col-xs-10"
        />
      <div className="form-group">
        <label className="control-label col-xs-2">分类</label>
        <div className="col-xs-10">
          {this.state.cateList.map(cate =>
            <label key={cate.id}>
              <input type="checkbox" name="post_cate" value={cate.id} onChange={()=> this.post_cate[cate.id] = !this.post_cate[cate.id]}/>
              {cate.name}
            </label>
          )}
        </div>
      </div>
        <button type="submit" {...props} className="btn btn-primary">{this.state.submitting ? '提交中...' : '提交'}</button>
      </Form>
    );
  }
}
