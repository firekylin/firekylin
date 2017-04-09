import React from 'react';
import { Radio, RadioGroup, Form, ValidatedInput, FileValidator } from 'react-bootstrap-validation';
import Base from 'base';
import firekylin from 'common/util/firekylin';

import BreadCrumb from 'admin/component/breadcrumb';
import TipAction from 'common/action/tip';

module.exports = class extends Base {
  state = {
    uploading: false,
    uploadType: 'wordpress'
  };
  handleValidSubmit(e) {
    this.setState({uploading: true});
    var form = new FormData();
    form.append('file', e.file[0]);
    form.append('importor', this.state.uploadType);
    firekylin.upload(form).then(result => {
      TipAction.success(result.data);
      alert(result.data);
      this.setState({uploading: false});
    }, () => {
      TipAction.fail('IMPORT_FAIL');
      this.setState({uploading: false});
    });
  }

  render() {
    let uploadType = this.state.uploadType;
    const radio = (
      <RadioGroup
          name='type'
          value={uploadType}
          validate={(value) => {
            uploadType = value;
            this.setState({ uploadType: uploadType });
            return true;
          }}
      >
        <Radio value='wordpress' label='WordPress' />
        <Radio value='ghost' label='Ghost / Jekyll' />
        <Radio value='hexo' label='Hexo' />
        <Radio value='markdown' label='Markdown文件' />
      </RadioGroup>
    );
    const uploadInput = {
      wordpress: (
        <div>
          <p>请上传 WordPress 中导出的 .xml 文件</p>
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
        </div>
      ),
      ghost: (
        <div>
          <p>请上传 Ghost 中导出的 .json 文件，Jekyll用户请上传使用 <a href="https://github.com/redwallhp/Jekyll-to-Ghost">Jekyll to Ghost 插件</a>导出后的 .json 文件</p>
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
              accept="application/json"
          />
        </div>
      ),
      hexo: (
        <div>
          <p>请上传使用 <a href="https://github.com/lizheming/hexo-generator-hexo2firekylin">Hexo2Firekylin 插件</a> 导出后的 .json 文件</p>
          <ValidatedInput
              type="file"
              name="file"
              label="上传文件："
              labelClassName="col-xs-2"
              wrapperClassName="col-xs-10"
              validate={files => {
                if(FileValidator.isEmpty(files)) {
                  return '请上传文件';
                }
                return true;
              }}
              accept="application/json"
          />
        </div>
      ),
      markdown: (
        <div>
          <p>请将所有 Markdown 文件直接打包成 tar.gz 文件上传</p>
          <ValidatedInput
              type="file"
              name="file"
              label="上传文件："
              labelClassName="col-xs-2"
              wrapperClassName="col-xs-10"
              validate={files => {
                if(FileValidator.isEmpty(files)) {
                  return '请上传文件';
                }
                return true;
              }}
              accept="application/gzip"
          />
        </div>
      )
    };
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <Form onValidSubmit={this.handleValidSubmit.bind(this)} className="clearfix options-import">
            <div className="form-group">
              <label>请选择导入的博客平台</label>
              { radio }
            </div>
            {uploadInput[this.state.uploadType]}
            <button type="submit" className="btn btn-primary">
              上传{this.state.uploading?'中...':''}
            </button>
          </Form>
        </div>
      </div>
    );
  }
}
