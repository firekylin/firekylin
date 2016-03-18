import React from 'react';
import ReactDom from 'react-dom';
import Base from 'base';
import {Link} from 'react-router';
import classnames from 'classnames';

import { Radio, RadioGroup } from 'react-bootstrap-validation';
import { Form, ValidatedInput } from 'react-bootstrap-validation';
import md5 from 'md5';

import BreadCrumb from 'admin/component/breadcrumb';

import OptionsAction from '../action/options';
import OptionsStore from '../store/options';
import TipAction from 'common/action/tip';

export default class extends Base {
  constructor(props){
    super(props);
    let comment = SysConfig.options.comment;
    if(typeof comment === 'string'){
      comment = JSON.parse(comment);
    }
    this.state = {
      submitting: false,
      comment: comment
    };
  }
  componentDidMount(){
    this.listenTo(OptionsStore, this.handleTrigger.bind(this));
  }
  handleTrigger(data, type){
    switch(type){
      case 'saveCommentSuccess':
        this.setState({submitting: false});
        TipAction.success('评论设置更新成功');
        let comment = JSON.parse(SysConfig.options.comment);
        SysConfig.options.comment = JSON.stringify({
          "comment": comment
        });
        break;
    }
  }
  handleValidSubmit(values){
    this.setState({submitting: true});
    this.optionsSavedValue = values;
    OptionsAction.comment(values);
  }
  getProps(name){
    let props = {
      value: this.state.comment[name] || '',
      onChange: this.changeInput.bind(this, name)
    };
    return props;
  }
  changeInput(type, event){
    let value = event.target.value;
    let comment = this.state.comment;
    comment[type] = value;
    this.setState({comment: comment});
  }
  render(){
    let comment = this.state.comment;
    let res = (
      <RadioGroup name='type' value={comment.type}>
        <Radio value='disqus' label='Disqus' />
        <Radio value='duoshuo' label='多说' />
      </RadioGroup>
    );

    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
        <Form onValidSubmit={this.handleValidSubmit.bind(this)} className="clearfix options-comment">
          <div className="form-group">
            <label>评论类型</label>
            { res }
          </div>

          <div className="form-group">
            <label>网站名称</label>
            <ValidatedInput
                type='text'
                {...this.getProps('name')}
                validate="required"
                errorHelp={{
                    required: '请填写在评论服务里的网站名称'
                }}
                name='name'
              />
          </div>
          <button type="submit" className="btn btn-primary" style={{ margin: '20px 0 0 10px' }}>{ this.state.submitting ? '提交中...' : '提交'  }</button>
        </Form>
      </div></div>
    );
  }
}
