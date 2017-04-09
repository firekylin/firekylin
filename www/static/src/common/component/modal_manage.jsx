import React from 'react';

import ModalAction from '../action/modal';
import ModalStore from '../store/modal';

import Base from './base';
import Modal from './modal';


/**
 * 通用弹出层管理，支持多个弹出层
 */
export default class extends Base {
  state = {
    list: []
  }

  componentDidMount() {
    this.listen(ModalStore, this.changeModalList, 'modalList');
    document.addEventListener('keydown', this.keyEvent.bind(this));
  }

  keyEvent(e) {
    if(!this.state.list.length) {
      return true;
    }

    if(e.keyCode === 27) {
      let data = this.state.list[this.state.list.length - 1];
      ModalAction.remove(data.idx);
      if(data.cancelCallback) {
        data.cancelCallback();
      }
    }

    if(e.keyCode === 13) {
      let okBtn = document.querySelector('.modal .modal-footer button.btn-primary');
      if(okBtn) {
        okBtn.focus();
      }
    }
  }

  changeModalList(data) {
    this.setState({list: data});
  }

  render() {
    if(!this.state.list || this.state.list.length === 0) {
      return (<div className="modal-list"></div>);
    }
    let content = this.state.list.map((item, index) => {
      return (<Modal data={item} key={index} />);
    });

    return (<div className="modal-list">{content}</div>);
  }
}
