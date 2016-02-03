import React from 'react';
import Base from '../../common/component/base';
import {Link} from 'react-router';
import classnames from 'classnames';

export default class extends Base {
  render(){
    return (
      <table className="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>邮箱</th>
            <th>用户组</th>
            <th>是否有效</th>
            <th>注册时间</th>
            <th>最后登录时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">1</th>
            <td>Mark</td>
            <td>Otto</td>
            <td>@mdo</td>
            <td>@mdo</td>
            <td>Otto</td>
            <td>@mdo</td>
            <td>
              <button type="button" className="btn btn-primary btn-xs">
                <span className="glyphicon glyphicon-edit" aria-hidden="true"></span> 编辑
              </button>&nbsp;
              <button type="button" className="btn btn-danger btn-xs">
                <span className="glyphicon glyphicon-remove" aria-hidden="true"></span> 删除
              </button>
            </td>
          </tr>
          <tr>
            <th scope="row">2</th>
            <td>Jacob</td>
            <td>Thornton</td>
            <td>@fat</td>
            <td>@mdo</td>
            <td>Otto</td>
            <td>@mdo</td>
            <td>编辑</td>
          </tr>
          <tr>
            <th scope="row">3</th>
            <td>Larry</td>
            <td>the Bird</td>
            <td>@mdo</td>
            <td>@twitter</td>
            <td>Otto</td>
            <td>@mdo</td>
            <td>编辑</td>
          </tr>
        </tbody>
      </table>
    )
  }
}