import React from 'react';
import ReactDom from 'react-dom';
import Base from 'base';
import {Link} from 'react-router';
import classnames from 'classnames';

import { Radio, RadioGroup } from 'react-bootstrap-validation';
import { Form, ValidatedInput } from 'react-bootstrap-validation';
import md5 from 'md5';

import OptionsAction from '../action/options';
import OptionsStore from '../store/options';
import TipAction from 'common/action/tip';

export default class extends Base {
  constructor(props){
    super(props);
    this.state = {
      submitting: false,
      comment: JSON.parse(SysConfig.options.comment)
    };
  }
  componentDidMount(){
    this.listenTo(OptionsStore, this.handleTrigger.bind(this));
  }
  handleTrigger(data, type){
    switch(type){
      case 'saveCommentSuccess':
        this.setState({submitting: false});
        TipAction.success('评论更新成功');
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
    let res;
    switch (comment.type){
      case 'duoshuo':
        res = (
          <RadioGroup name='type'
                      value='duoshuo' >
            <Radio value='disqus' label='disqus' />
            <Radio value='duoshuo' label='duoshuo' />
          </RadioGroup>
        );
        break;
      case 'disqus':
        res = (
          <RadioGroup name='type'
                      value='disqus' >
            <Radio value='disqus' label='disqus' />
            <Radio value='duoshuo' label='duoshuo' />
          </RadioGroup>
        );
        break;
    }

    return (
      <Form onValidSubmit={this.handleValidSubmit.bind(this)}>
        <div className="form-group" >
          <label className="control-label col-xs-1">
            <span>分类名称: </span>
          </label>
          <div className="col-xs-10">
            { res }
          </div>
        </div>

        <div className="form-group">
          <label className="control-label col-xs-1">
            <span>评论名称: </span>
          </label>
          <div className="col-xs-10">
            <ValidatedInput
              type='text'
              {...this.getProps('name')}
              name='name'
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" style={{ margin: '20px 0 0 10px' }}>{ this.state.submitting ? '提交中...' : '提交'  }</button>
      </Form>
    );
  }
}
