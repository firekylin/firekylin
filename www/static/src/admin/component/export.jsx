import React from 'react';
import { Button, ButtonToolbar } from 'react-bootstrap'
import superagent from 'superagent';
import Base from 'base';

import BreadCrumb from 'admin/component/breadcrumb';

// TODO: wordpress xml
module.exports = class extends Base {
  fetchData(type) {
    superagent.get(`/admin/api/file/get?type=${type}`).end();
  }
  render() {
      const menu = (
        <ButtonToolbar>
          <Button
            href="/admin/api/file/get?type=markdown"
          >下载 Markdown 文件</Button>
          {/*<Button disabled>下载 Wordpress .xml 文件</Button>*/}
        </ButtonToolbar>
      )
      return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          { menu }
        </div>
      </div>
    );
  }
}
