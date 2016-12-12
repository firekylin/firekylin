import React from 'react';
//import {Promise} from 'es6-promise';
//import autobind from 'autobind-decorator';
//import classNames from 'classnames';

import Base from './base';
import Modal from './modal';

import ModalAction from '../action/modal';
import ModalStore from '../store/modal';

/**
 * 通用弹出层管理，支持多个弹出层
 */
export default class extends Base {
  state = {
    list: []
  }

  componentDidMount(){
    this.listen(ModalStore, this.changeModalList, 'modalList');
    document.addEventListener('keydown', this.closeEvent.bind(this));
  }

  closeEvent(e) {
    if( !this.state.list.length ) {
      return true;
    }

    if( e.keyCode !== 27 ) {
      return true;
    }

    ModalAction.remove( this.state.list[this.state.list.length - 1].idx );
  }

  changeModalList(data){
    this.setState({list: data});
  }

  render(){
    if(!this.state.list || this.state.list.length === 0){
      return (<div className="modal-list"></div>);
    }
    let content = this.state.list.map((item, index) => {
      return (<Modal data={item} key={index} />);
    });

    return (<div className="modal-list">{content}</div>);
  }
}