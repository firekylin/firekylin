import React from 'react';
import ReactDom from 'react-dom';
import Base from '../../common/component/base';
import {Link} from 'react-router';
import classnames from 'classnames';
import { Form, ValidatedInput } from 'react-bootstrap-validation';

import CateAction from '../action/cate';
import CateStore from '../store/cate';
import TipAction from '../../common/action/tip';

export default class extends Base {
  constructor(props){
    super(props);
    this.state = {
      submitting: false,
      cateInfo: {},
      cateList: [],
      pid: 0
    }
    this.id = this.props.params.id | 0;
  }

  componentWillMount() {
    this.listenTo(CateStore, this.handleTrigger.bind(this));
    CateAction.select();
    if(this.id){
      CateAction.select(this.id);
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
      case 'saveCateFail':
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
      case 'getCateList':
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
    return (
      <Form
        model={this.state.cateInfo}
        className="cate-create clearfix"
        onValidSubmit={this.handleValidSubmit.bind(this)}
      >
        <ValidatedInput
            name="name"
            type="text"
            label="分类名称"
            labelClassName="col-xs-2"
            wrapperClassName="col-xs-10"
        />
        <ValidatedInput
            name="pathname"
            type="text"
            label="分类缩略名"
            labelClassName="col-xs-2"
            wrapperClassName="col-xs-10"
        />
        <div className="form-group">
          <label className="control-label col-xs-2">父级分类</label>
          <div className="col-xs-10">
            <select className="form-control" onChange={e => this.setState({pid: e.target.value})} defaultValue={this.state.pid}>
              {cateList.length === 1 ? <option value={cateList[0].id}>{cateList[0].name}</option>
              : cateList.map(item => <option key={item.id} value={item.id}>{item.name}</option>)
              }
            </select>
          </div>
        </div>
        <button type="submit" {...props} className="btn btn-primary">{this.state.submitting ? '提交中...' : '提交'}</button>
      </Form>
    );
  }
}
