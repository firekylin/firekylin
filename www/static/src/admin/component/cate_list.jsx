import React from 'react';
import {Link} from 'react-router';

import CateAction from '../action/cate';
import CateStore from '../store/cate';
import OptionsAction from '../action/options';
import OptionsStore from '../store/options';
import Base from 'base';
import BreadCrumb from 'admin/component/breadcrumb';
import TipAction from 'common/action/tip';
import ModalAction from 'common/action/modal';

module.exports = class extends Base {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      cateList: [],
      defaultCategory: null
    }
  }
  componentDidMount() {
    this.listenTo(CateStore, this.handleTrigger.bind(this));
    this.listenTo(OptionsStore, this.getOptionTrigger.bind(this));
    CateAction.select();
    OptionsAction.defaultCategory();
  }
  handleTrigger(data, type) {
    switch(type) {
      case 'deleteCateFail':
        TipAction.fail(data);
        break;
      case 'deleteCateSuccess':
        TipAction.success('删除成功');
        this.setState({loading: true}, CateAction.select);
        break;
      case 'getCateList':
        this.setState({cateList: data, loading: false});
        break;
    }
  }
  getOptionTrigger(data, type) {
    switch(type) {
      case 'getDefaultCategorySuccess':
        this.setState({defaultCategory: data});
        break;
      case 'saveDefaultCategorySuccess':
        TipAction.success('默认分类设置成功');
        OptionsAction.defaultCategory();
        break;
    }
  }
  renderDefaultCategoryBtn(id) {
    if(this.state.defaultCategory === id) {
      return (
        <button
            disabled
            type="button"
            className="btn btn-success btn-xs"
        >
          <span className="glyphicon glyphicon-star"></span>
          默认
        </button>
      );
    }

    return (
      <button
          type="button"
          className="btn btn-success btn-xs"
          onClick={()=> OptionsAction.defaultCategory(id)}
      >
        <span className="glyphicon glyphicon-star"></span>
        默认
      </button>
    );
  }
  getCateList() {
    if(this.state.loading) {
      return (<tr><td colSpan="8" className="center">加载中……</td></tr>);
    }
    if(!this.state.cateList.length) {
      return (<tr><td colSpan="8" className="center">暂无分类</td></tr>);
    }
    return this.state.cateList.map(item => {
      return (
        <tr key={item.id}>
          <td>{item.name}</td>
          <td>{item.pathname}</td>
          <td>{item.post_cate}</td>
          <td>
            {this.renderDefaultCategoryBtn(item.id)}
            <span> </span>
            <Link to={`/cate/edit/${item.id}`} title={item.name}>
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
                    CateAction.delete.bind(CateAction, item.id),
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
  render() {
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>名称</th>
                <th>缩略名</th>
                <th>文章数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {this.getCateList()}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}
