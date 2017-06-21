import React from 'react';
import { Button } from 'react-bootstrap';
import { Radio, RadioGroup, Form } from 'react-bootstrap-validation';
import Base from 'base';

import BreadCrumb from 'admin/component/breadcrumb';

module.exports = class extends Base {
  state = {
    exportType: 'markdown',
    href: '/admin/api/file/get?type=markdown'
  };
  render() {
    let exportType = this.state.exportType;
    const radio = (
      <RadioGroup
        name='type'
        value={exportType}
        validate={(value) => {
          exportType = value;
          this.setState({
            exportType: exportType,
            href: '/admin/api/file/get?type=' + value
           });
          return true;
        }}
      >
        <Radio value='markdown' label='Markdown' />
        <Radio value='wordpress' label='WordPress eXtended RSS' />
      </RadioGroup>
    );
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <Form>
            <label> 请选择导出的文件类型 </label>
            { radio }
            <Button
              href={this.state.href}
              bsStyle='primary'
            >
              下载
            </Button>
          </Form>
        </div>
      </div>
    );
  }
}
