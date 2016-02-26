import React from 'react';
import ReactDom from 'react-dom';
import Base from '../../common/component/base';
import {Link} from 'react-router';
import classnames from 'classnames';
import { Form, ValidatedInput } from 'react-bootstrap-validation';
import md5 from 'md5';

import OptionsAction from '../action/options';
import OptionsStore from '../store/options';
import TipAction from '../../common/action/tip';

export default class extends Base {
  constructor(props){
    super(props);
    this.state = {
      submitting: false,
      options: SysConfig.options
    }
  }
  componentDidMount(){
    this.listenTo(OptionsStore, this.handleTrigger.bind(this));
  }
  handleTrigger(data, type){
    switch(type){
      case 'saveOptionsSuccess':
        this.setState({submitting: false});
        TipAction.success('更新成功');
        for(let key in this.optionsSavedValue){
          SysConfig.options[key] = this.optionsSavedValue[key];
        }
        break;
    }
  }
  changeInput(type, event){
    let value = event.target.value;
    let options = this.state.options;
    options[type] = value;
    this.setState({options: options});
  }
  getProps(name){
    let props = {
      value: this.state.options[name] || '',
      onChange: this.changeInput.bind(this, name)
    }
    if(['title', 'description'].indexOf(name) > -1){
      props.validate = 'required'
    }
    return props;
  }
  handleValidSubmit(values){
    this.setState({submitting: true});
    this.optionsSavedValue = values;
    OptionsAction.save(values);
  }
  handleInvalidSubmit(){

  }
  render(){
    let BtnProps = {}
    if(this.state.submitting){
      BtnProps.disabled = true;
    }
    return (
      <div>
        <h3 style={{marginBottom: '20px'}}>基本设置</h3>
        <Form 
        className="clearfix options-general" 
        onValidSubmit={this.handleValidSubmit.bind(this)} 
        onInvalidSubmit={this.handleInvalidSubmit.bind(this)}
        >
          <div className="form-group">
            <label>站点名称</label>
            <ValidatedInput 
              type="text" 
              name="title"
              ref="title"
              {...this.getProps('title')}
              className="form-control"
              errorHelp={{
                required: '请填写站点名称',
              }}
            />
          </div>
          <div className="form-group">
            <label>LOGO 地址</label>
            <ValidatedInput 
              type="text" 
              name="logo_url" 
              {...this.getProps('logo_url')}
              ref="logo_url"
              className="form-control" 
            />
            <p className="help-block">尺寸最好为 140px x 140px。</p>
          </div>
          <div className="form-group">
            <label>站点描述</label>
            <ValidatedInput 
              type="text" 
              name="description" 
              {...this.getProps('description')}
              ref="description" 
              className="form-control" 
              errorHelp={{
                required: '请填写站点描述'
              }}
            />
          </div>
          <div className="form-group">
            <label>关键词</label>
            <ValidatedInput 
              type="text" 
              name="keywords" 
              {...this.getProps('keywords')}
              ref="keywords"
              className="form-control" 
              errorHelp={{
                required: '请填写站点关键词'
              }}
            />
            <p className="help-block">请以半角逗号 "," 分割多个关键字.</p>
          </div>
          <div className="form-group">
            <label>GitHub 地址</label>
            <ValidatedInput 
              type="text" 
              name="github_url" 
              {...this.getProps('github_url')}
              ref="github_url"
              className="form-control" 
            />
          </div>
          <div className="form-group">
            <label>微博地址</label>
            <ValidatedInput 
              type="text" 
              name="weibo_url" 
              {...this.getProps('weibo_url')}
              ref="weibo_url"
              className="form-control" 
            />
          </div>
          <div className="form-group">
            <label>网站备案号</label>
            <ValidatedInput 
              type="text" 
              name="miitbeian" 
              {...this.getProps('miitbeian')}
              ref="miitbeian"
              className="form-control" 
            />
          </div>
          <button type="submit" {...BtnProps} className="btn btn-primary">{this.state.submitting ? '提交中...' : '提交'}</button>
        </Form>
      </div>
    );
  }
}