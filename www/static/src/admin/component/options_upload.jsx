import React from 'react';
import { Radio, RadioGroup, Form, ValidatedInput } from 'react-bootstrap-validation';

import OptionsAction from '../action/options';
import OptionsStore from '../store/options';
import Base from 'base';
import BreadCrumb from 'admin/component/breadcrumb';
import TipAction from 'common/action/tip';

module.exports = class extends Base {
  constructor(props) {
    super(props);
    let upload = window.SysConfig.options.upload;
    if(typeof upload === 'string') {
      upload = JSON.parse(upload);
    }
    this.state = {
      submitting: false,
      upload: upload
    };
  }
  componentDidMount() {
    this.listenTo(OptionsStore, this.handleTrigger.bind(this));
  }
  handleTrigger(data, type) {
    switch(type) {
      case 'saveUploadSuccess':
        this.setState({submitting: false});
        TipAction.success('上传设置更新成功');
        let upload = JSON.parse(window.SysConfig.options.upload);
        window.SysConfig.options.upload = JSON.stringify({
          'upload': upload
        });
        break;
    }
  }
  handleValidSubmit(values) {
    this.setState({submitting: true});
    this.optionsSavedValue = values;
    OptionsAction.upload(values);
  }
  getProps(name) {
    let props = {
      value: this.state.upload[name] || '',
      onChange: this.changeInput.bind(this, name)
    };
    return props;
  }
  changeInput(type, event) {
    let value = event.target.value;
    let upload = this.state.upload;
    upload[type] = value;
    this.setState({upload: upload});
  }

  render() {
    let upload = this.state.upload;
    let res = (
      <RadioGroup
          name='type'
          value={upload.type}
          validate={(value) => {
            upload.type = value;
            this.setState({ upload: upload });
            return true;
          }}
      >
        <Radio value='local' label='本地' />
        <Radio value='qiniu' label='七牛云' />
        <Radio value='upyun' label='又拍云' />
      </RadioGroup>
    );
    let qiniu = (
      <div>
        <div className="form-group">
          <label>AccessKey</label>
          <ValidatedInput
              type='text'
              {...this.getProps('accessKey')}
              validate="required"
              errorHelp={{
                  required: '请填写七牛云的accessKey'
              }}
              name='accessKey'
            />
        </div>
        <div className="form-group">
          <label>SecretKey</label>
          <ValidatedInput
              type='text'
              {...this.getProps('secretKey')}
              validate="required"
              errorHelp={{
                  required: '请填写七牛云的secretKey'
              }}
              name='secretKey'
            />
        </div>
        <div className="form-group">
          <label>空间名(Bucket)</label>
          <ValidatedInput
              type='text'
              {...this.getProps('bucket')}
              validate="required"
              errorHelp={{
                  required: '请填写七牛云的空间名'
              }}
              name='bucket'
            />
        </div>
        <div className="form-group">
          <label>七牛云域名</label>
          <ValidatedInput
              type='text'
              {...this.getProps('origin')}
              validate="required"
              errorHelp={{
                  required: '请填写七牛云的域名'
              }}
              name='origin'
            />
        </div>
        <div className="form-group">
          <label>路径前缀</label>
          <ValidatedInput
              type='text'
              {...this.getProps('prefix')}
              name='prefix'
            />
        </div>
      </div>
    )
    let upyun = (
      <div>
        <div className="form-group">
          <label>操作员</label>
          <ValidatedInput
              type='text'
              {...this.getProps('operater')}
              validate="required"
              errorHelp={{
                  required: '请填写又拍云的操作员'
              }}
              name='operater'
            />
        </div>
        <div className="form-group">
          <label>操作员密码</label>
          <ValidatedInput
              type='text'
              {...this.getProps('password')}
              validate="required"
              errorHelp={{
                  required: '请填写又拍云的操作员密码'
              }}
              name='password'
            />
        </div>
        <div className="form-group">
          <label>服务名(Bucket)</label>
          <ValidatedInput
              type='text'
              {...this.getProps('upyunBucket')}
              validate="required"
              errorHelp={{
                  required: '请填写又拍云的服务名'
              }}
              name='upyunBucket'
            />
        </div>
        <div className="form-group">
          <label>又拍云域名</label>
          <ValidatedInput
              type='text'
              {...this.getProps('upyunOrigin')}
              validate="required"
              errorHelp={{
                  required: '请填写又拍云的域名'
              }}
              name='upyunOrigin'
            />
        </div>
        <div className="form-group">
          <label>路径前缀</label>
          <ValidatedInput
              type='text'
              {...this.getProps('upyunPrefix')}
              name='upyunPrefix'
            />
        </div>
      </div>
    )
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
        <Form onValidSubmit={this.handleValidSubmit.bind(this)} className="clearfix options-upload">
          <div className="form-group">
            <label>图片上传至：</label>
            { res }
          </div>
          { upload.type === 'qiniu' && qiniu }
          { upload.type === 'upyun' && upyun }
          <button type="submit" className="btn btn-primary" style={{ margin: '20px 0 0 10px' }}>
            { this.state.submitting ? '提交中...' : '提交' }
          </button>
        </Form>
      </div>
    </div>
    );
  }
}
