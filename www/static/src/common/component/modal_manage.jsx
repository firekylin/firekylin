import React from 'react';
//import {Promise} from 'es6-promise';
//import autobind from 'autobind-decorator';
//import classNames from 'classnames';

import Base from './base';
import Modal from './modal';

import ModalStore from '../store/modal';

/**
 * 通用弹出层管理，支持多个弹出层
 */
export default class extends Base {
  componentDidMount(){
    this.listen(ModalStore, this.changeModalList, 'modalList');
  }

  changeModalList(data){
    this.setState({list: data});
  }

  render(){
    if(!this.state.list || this.state.list.length === 0){
      return (<div className="modal-list"></div>);
    }
    let content = this.state.list.map(item => {
      return (<Modal data={item} />);
    });

    return (<div className="modal-list">{content}</div>);
  }
}