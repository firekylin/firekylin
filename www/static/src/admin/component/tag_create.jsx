import React from 'react';
import ReactDom from 'react-dom';
import Base from 'base';
import {Link} from 'react-router';
import classnames from 'classnames';
import { Form, ValidatedInput } from 'react-bootstrap-validation';

import BreadCrumb from 'admin/component/breadcrumb';
import TagAction from 'admin/action/tag';
import TagStore from 'admin/store/tag';
import TipAction from 'common/action/tip';

export default class extends Base {
  initialState() {
    return Object.assign({
      submitting: false,
      tagInfo: {
        name: '',
        pathname: ''
      }
    });
  }
  constructor(props){
    super(props);
    this.state = this.initialState();
    this.id = this.props.params.id | 0;
  }

  componentWillMount() {
    this.listenTo(TagStore, this.handleTrigger.bind(this));
    if(this.id){
      TagAction.select(this.id);
    }
  }

  componentWillReceiveProps(nextProps) {
    this.id = nextProps.params.id | 0;
    if( this.id ) {
      TagAction.select(this.id);
    }
    this.setState(this.initialState());
  }
  /**
   * hanle trigger
   * @param  {[type]} data [description]
   * @param  {[type]} type [description]
   * @return {[type]}      [description]
   */
  handleTrigger(data, type){
    switch(type){
      case 'saveTagFail':
        TipAction.fail(data.message);
        this.setState({submitting: false});
        break;
      case 'saveTagSuccess':
        TipAction.success(this.id ? '保存成功' : '添加成功');
        this.setState({submitting: false});
        setTimeout(() => this.redirect('tag/list'), 1000);
        break;
      case 'getTagInfo':
        this.setState({tagInfo: data});
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
    values.pid = this.state.pid;
    TagAction.save(values);
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

    //如果是在编辑状态下在没有拿到数据之前不做渲染
    //针对 react-bootstrap-validation 插件在 render 之后不更新 defaultValue 做的处理
    if( this.id && !this.state.tagInfo.pathname ) {
      return null;
    }

    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <Form
            model={this.state.tagInfo}
            className="tag-create clearfix"
            onValidSubmit={this.handleValidSubmit.bind(this)}
          >
            <ValidatedInput
                name="name"
                type="text"
                label="标签名称"
                labelClassName="col-xs-1"
                wrapperClassName="col-xs-4"
                value={this.state.tagInfo.name}
                validate="required"
                onChange={e => {
                  this.state.tagInfo.name = e.target.value;
                  this.forceUpdate();
                }}
                errorHelp={{
                    required: '请填写标签名称'
                }}
            />
            <ValidatedInput
                name="pathname"
                type="text"
                label="缩略名"
                labelClassName="col-xs-1"
                wrapperClassName="col-xs-4"
                value={this.state.tagInfo.pathname}
                onChange={e => {
                  this.state.tagInfo.pathname = e.target.value;
                  this.forceUpdate();
                }}
            />
            <div className="form-group col-xs-12">
              <button type="submit" {...props} className="btn btn-primary">{this.state.submitting ? '提交中...' : '提交'}</button>
            </div>
          </Form>
        </div>
      </div>
    );
  }
}
