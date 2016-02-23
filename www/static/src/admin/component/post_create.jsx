import React from 'react';
import ReactDom from 'react-dom';
import Base from '../../common/component/base';
import {Link} from 'react-router';
import classnames from 'classnames';
import { Form, ValidatedInput } from 'react-bootstrap-validation';

import PostAction from '../action/post';
import PostStore from '../store/post';
import TipAction from '../../common/action/tip';

export default class extends Base {
  constructor(props){
    super(props);
    this.state = {
      submitting: false,
      postInfo: {}
    }
    this.id = this.props.params.id | 0;
  }
  componentDidMount(){
    this.listenTo(PostStore, this.handleTrigger.bind(this));
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
        className="post-create clearfix"
        onValidSubmit={this.handleValidSubmit.bind(this)}
      >
        <ValidatedInput
            name="title"
            type="text"
        />
        <button type="submit" {...props} className="btn btn-primary">{this.state.submitting ? '提交中...' : '提交'}</button>
      </Form>
    );
  }
}
