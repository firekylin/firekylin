import React from 'react';
import { Form, ValidatedInput } from 'react-bootstrap-validation';

import Base from 'base';
import BreadCrumb from 'admin/component/breadcrumb';
import PushAction from 'admin/action/push';
import PushStore from 'admin/store/push';
import TipAction from 'common/action/tip';

module.exports = class extends Base {
  initialState() {
    return Object.assign({
      submitting: false,
      pushInfo: {
        key: '',
        title: ''
      }
    });
  }
  constructor(props) {
    super(props);
    this.state = this.initialState();
    this.id = this.props.params.id;
  }

  componentWillMount() {
    this.listenTo(PushStore, this.handleTrigger.bind(this));
    if(this.id) {
      PushAction.select(this.id);
    }
  }

  componentWillReceiveProps(nextProps) {
    this.id = nextProps.params.id | 0;
    if(this.id) {
      PushAction.select(this.id);
    }
    this.setState(this.initialState());
  }
  /**
   * hanle trigger
   * @param  {[type]} data [description]
   * @param  {[type]} type [description]
   * @return {[type]}      [description]
   */
  handleTrigger(data, type) {
    switch(type) {
      case 'savePushFailed':
        TipAction.fail(data.message);
        this.setState({submitting: false});
        break;
      case 'savePushSuccess':
        TipAction.success(this.id ? '保存成功' : '添加成功');
        this.setState({submitting: false});
        setTimeout(() => this.redirect('push/list'), 1000);
        break;
      case 'getPushInfo':
        this.setState({pushInfo: data});
        break;
    }
  }
  /**
   * save
   * @return {}       []
   */
  handleValidSubmit(values) {
    this.setState({submitting: true});
    if(this.id) {
      values.id = this.id;
    }
    PushAction.save(values);
  }
  /**
   * render
   * @return {} []
   */
  render() {
    let props = {}
    if(this.state.submitting) {
      props.disabled = true;
    }

    //如果是在编辑状态下在没有拿到数据之前不做渲染
    //针对 react-bootstrap-validation 插件在 render 之后不更新 defaultValue 做的处理
    if(this.id && !this.state.pushInfo.title) {
      return null;
    }

    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <Form
            model={this.state.pushInfo}
            className="tag-create clearfix"
            onValidSubmit={this.handleValidSubmit.bind(this)}
          >
            <div className="alert alert-info" role="alert" style={{maxWidth: '700px'}}>
              推送功能是指在本系统写博客时可以将文章推送到其他也使用 Firekylin 构建的博客系统中。
              最明显的需求就是个人写博客时需要将文章推送到团队博客中。如果每次都是写完后把内容拷贝到团队博客中势必非常麻烦，
              使用推送功能就非常简单了。
            </div>
            <ValidatedInput
                name="title"
                type="text"
                label="网站名称"
                labelClassName="col-xs-1"
                wrapperClassName="col-xs-4"
                validate="required"
                errorHelp={{
                    required: '请填写网站名称'
                }}
            />
            <ValidatedInput
                name="url"
                type="text"
                label="网站地址"
                labelClassName="col-xs-1"
                wrapperClassName="col-xs-4"
                validate="required"
                errorHelp={{
                    required: '请填写网站地址'
                }}
            />
            <ValidatedInput
                name="appKey"
                type="text"
                label="推送公钥"
                labelClassName="col-xs-1"
                wrapperClassName="col-xs-4"
                validate="required"
                errorHelp={{
                    required: '请填写推送公钥'
                }}
            />
            <ValidatedInput
                name="appSecret"
                type="text"
                label="推送秘钥"
                labelClassName="col-xs-1"
                wrapperClassName="col-xs-4"
                validate="required"
                errorHelp={{
                    required: '请填写推送秘钥'
                }}
            />
            <div className="form-group col-xs-12">
              <button type="submit" {...props} className="btn btn-primary">
                {this.state.submitting ? '提交中...' : '提交'}
              </button>
            </div>
          </Form>
        </div>
      </div>
    );
  }
}
