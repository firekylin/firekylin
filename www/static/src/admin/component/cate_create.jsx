import React from 'react';
import ReactDom from 'react-dom';
import Base from 'base';
import {Link} from 'react-router';
import classnames from 'classnames';
import { Form, ValidatedInput } from 'react-bootstrap-validation';

import BreadCrumb from 'admin/component/breadcrumb';
import CateAction from '../action/cate';
import CateStore from '../store/cate';
import TipAction from 'common/action/tip';

export default class extends Base {
  initialState() {
    return Object.assign({
      submitting: false,
      cateInfo: {
        name: '',
        pathname: ''
      },
      pid: 0,
      cateList: []
    });
  }
  constructor(props){
    super(props);
    this.state = this.initialState();
    this.id = this.props.params.id | 0;
  }

  componentWillMount() {
    this.listenTo(CateStore, this.handleTrigger.bind(this));
    CateAction.selectParent();
    if(this.id){
      CateAction.select(this.id);
    }
  }

  componentWillReceiveProps(nextProps) {
    this.id = nextProps.params.id | 0;
    if( this.id ) {
      CateAction.select(this.id);
    }

    let state = this.initialState();
    state.cateList = this.state.cateList;
    this.setState(state);
  }
  /**
   * hanle trigger
   * @param  {[type]} data [description]
   * @param  {[type]} type [description]
   * @return {[type]}      [description]
   */
  handleTrigger(data, type){
    switch(type){
      case 'saveCateFail':
        TipAction.fail(data.message);
        this.setState({submitting: false});
        break;
      case 'saveCateSuccess':
        TipAction.success(this.id ? '保存成功' : '添加成功');
        this.setState({submitting: false});
        setTimeout(() => this.redirect('cate/list'), 1000);
        break;
      case 'getCateInfo':
        this.setState({cateInfo: data});
        break;
      case 'getCateParent':
        this.setState({cateList: data});
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
    CateAction.save(values);
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
    let cateList = [{id:0, name:'不选择'}].concat(this.state.cateList);

    //如果是在编辑状态下在没有拿到数据之前不做渲染
    //针对 react-bootstrap-validation 插件在 render 之后不更新 defaultValue 做的处理
    if( this.id && !this.state.cateInfo.pathname ) {
      return null;
    }

    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <Form
            model={this.state.cateInfo}
            className="cate-create clearfix"
            onValidSubmit={this.handleValidSubmit.bind(this)}
          >
            <ValidatedInput
                name="name"
                type="text"
                label="分类名称"
                labelClassName="col-xs-1"
                wrapperClassName="col-xs-4"
                value={this.state.cateInfo.name}
                validate="required"
                onChange={e => {
                  this.state.cateInfo.name = e.target.value;
                  this.forceUpdate();
                }}
                errorHelp={{
                    required: '请填写分类名称'
                }}
            />
            <ValidatedInput
                name="pathname"
                type="text"
                label="缩略名"
                labelClassName="col-xs-1"
                wrapperClassName="col-xs-4"
                value={this.state.cateInfo.pathname}
                onChange={e => {
                  this.state.cateInfo.pathname = e.target.value;
                  this.forceUpdate();
                }}
            />
            <div className="form-group">
              <label className="control-label col-xs-1">父级分类</label>
              <div className="col-xs-4">
                <select className="form-control" onChange={e => this.setState({pid: e.target.value})} value={this.state.pid}>
                  {cateList.length === 1 ? <option value={cateList[0].id}>{cateList[0].name}</option>
                  : cateList.map(item => <option key={item.id} value={item.id}>{item.name}</option>)
                  }
                </select>
              </div>
            </div>
            <button type="submit" {...props} className="btn btn-primary">{this.state.submitting ? '提交中...' : '提交'}</button>
          </Form>
        </div>
      </div>
    );
  }
}
