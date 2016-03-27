import React from 'react';
import Base from 'base';
import {Link} from 'react-router';
import classnames from 'classnames';

import BreadCrumb from 'admin/component/breadcrumb';
import ModalAction from 'common/action/modal';
import TipAction from 'common/action/tip';
import PushAction from 'admin/action/push';
import PushStore from 'admin/store/push';

import firekylin from 'common/util/firekylin';

export default class extends Base {
  constructor(props){
    super(props);
    this.state = {
      loading: false,
      pushList: []
    }
  }
  componentDidMount(){
    this.listenTo(PushStore, this.handleTrigger.bind(this));
    PushAction.select();
  }
  handleTrigger(data, type){
    switch(type){
      case 'deletePushFail':
        TipAction.fail(data);
        break;
      case 'deletePushSuccess':
        TipAction.success('删除成功');
        this.setState({loading: true}, PushAction.select.bind(PushAction));
        break;
      case 'getPushList':
        this.setState({pushList: data, loading: false});
        break;
    }
  }
  getPushList(){
    if(this.state.loading){
      return (<tr><td colSpan="8" className="center">加载中。。。</td></tr>);
    }
    if(!this.state.pushList.length){
      return (<tr><td colSpan="8" className="center">暂无记录</td></tr>);
    }
    return this.state.pushList.map(item => {
      return (
        <tr key={item.key}>
          <td>{item.key}</td>
          <td>{item.title}</td>
          <td>
            <Link to={`/push/edit/${item.key}`} title={item.url}>
              <button type="button" className="btn btn-primary btn-xs">
                <span className="glyphicon glyphicon-edit"></span>
                编辑
              </button>
            </Link>
            <span> </span>
            <button
                type="button"
                className="btn btn-danger btn-xs"
                onClick={()=>
                  ModalAction.confirm(
                    '提示',
                    <div className="center">确定删除吗？</div>,
                    PushAction.delete.bind(PushAction, item.key),
                    'modal-sm'
                  )
                }
            >
              <span className="glyphicon glyphicon-remove"></span>
              删除
            </button>
          </td>
        </tr>
      );
    })
  }

  render(){
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>推送密钥</th>
                <th>推送地址</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {this.getPushList()}
            </tbody>
          </table>
          </div>
      </div>
    )
  }
}
