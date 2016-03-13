import React from 'react';
import Base from 'base';
import { Form, ValidatedInput, FileValidator } from 'react-bootstrap-validation';
import firekylin from 'common/util/firekylin';

import BreadCrumb from 'admin/component/breadcrumb';
import TipAction from 'common/action/tip';

export default class extends Base {
  state = {
    uploading: false
  }
  handleValidSubmit(e) {
    this.setState({uploading: true});
    var form = new FormData();
    form.append('file', e.file[0]);
    form.append('importor', 'wordpress');
    firekylin.upload(form).then(result => {
      TipAction.success(result.data);
      alert(result.data);
      this.setState({uploading: false});
    }, err => {
      TipAction.fail('IMPORT_FAIL');
      this.setState({uploading: false});
    });
  }
  render(){
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <div className="options-2fa">
            <h3 style={{marginBottom: '20px'}}>上传 WXR 文件</h3>
            <p>请上传 WordPress 中导出的 .xml 文件</p>
            <Form
                className="clearfix form-horizonal"
                onValidSubmit={this.handleValidSubmit.bind(this)}
            >
              <ValidatedInput
                  type="file"
                  name="file"
                  label="上传文件："
                  labelClassName="col-xs-2"
                  wrapperClassName="col-xs-10"
                  validate={files => {
                    if (FileValidator.isEmpty(files)) {
                        return '请上传文件';
                    }
                    return true;
                  }}
                  accept="application/xml"
              />
              <button type="submit" className="btn btn-primary">上传{this.state.uploading?'中...':''}</button>
            </Form>
          </div>
        </div>
      </div>
    );
  }
}
