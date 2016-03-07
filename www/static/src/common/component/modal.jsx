import React from 'react';
//import {Promise} from 'es6-promise';
//import autobind from 'autobind-decorator';
import classNames from 'classnames';

import Base from './base';
import ModalStore from '../store/modal';
import ModalActions from '../action/modal';
import firekylin from '../../common/util/firekylin';

/**
 * 通用弹出层
 */
export default class extends Base {
  constructor(props){
    super(props);
  }

  componentDidMount(){
    window.addEventListener("hashchange", this.hashchange);
    this.listenTo(ModalStore, this.change.bind(this));
  }
  /**
   * 改变状态
   * @param  {[type]} data [description]
   * @return {[type]}      [description]
   */
  change() {

  }
  /**
   * hashchange的时候关闭弹层
   * @param  {[type]} data [description]
   * @return {[type]}      [description]
   */
  hashchange(){
    ModalActions.remove(this.data.idx);
  }
  /**
   * parse panel data
   * @param  {[type]} data [description]
   * @return {[type]}      [description]
   */
  parsePanelData(data){
    let options = data.options;
    let buttons = [];

    let getBtns = callback => {
      return [{
        text: '取消',
        callback: this.close,
        className: 'btn-cancel'
      }, {
        text: '确定',
        callback: event => {
          event.preventDefault();
          return this.btnClick(callback);
        },
        className: 'btn-ok'
      }];
    };
    if(typeof options === 'function'){
      buttons = getBtns(options);
    }else if(typeof options.buttons === 'function'){
      buttons = getBtns(options.buttons);
    }else if(!options.buttons){
      buttons = [];
    }else {
      if(!options.buttons.map){
        options.buttons = [{
          text: '取消',
          callback: this.close,
          className: 'btn-cancel'
        }, options.buttons];
      }
      buttons = firekylin.extend([], options.buttons);
      buttons = buttons.map(item => {
        item.className = item.className || 'btn-ok';
        if(item.callback){
          let callback = item.callback;
          item.callback = event => {
            event.preventDefault();
            return this.btnClick(callback);
          };
        }else{
          item.callback = this.close;
        }
        return item;
      });
    }
    data.buttons = buttons;
    return data;
  }
  /**
   * 关闭弹出层
   * @param  {[type]} event [description]
   * @return {[type]}       [description]
   */
  close(event){
    event.preventDefault();
    if(this.data.options && this.data.options.onClose){
      this.data.options.onClose(this);
    }
    ModalActions.remove(this.data.idx);
  }

  getAlert(){
    return (
      <div className="dialog-alert anim-modal">
        <h2 className="title">{this.data.title}</h2>
        <div className="dialog-content">
            {this.data.content}
        </div>
        <div className="btn-box">
            <a href="###" onClick={this.close} className="btn-cancel">关闭</a>
        </div>
      </div>
    );
  }

  btnClick(callback){
    if(this._btnClicked){
      return;
    }
    this._btnClicked = true;
    return Promise.resolve(callback(this)).then(data => {
      if(data === false){
        return Promise.reject();
      }
      ModalActions.remove(this.data.idx);
      this._btnClicked = false;
    }).catch(() => {
      this._btnClicked = false;
    });
  }
  /**
   * confirm确定处理
   * @param  {[type]} event [description]
   * @return {[type]}       [description]
   */
  confirm(event){
    event.preventDefault();
    return this.btnClick(this.data.callback);
  }
  /**
   * confirm components
   * @return {[type]} [description]
   */
  getConfirm(){
    let className = classNames({
      'dialog-confirm': true,
      'anim-modal': true
    });
    return (
      <div className={className}>
        {this.data.content}
      </div>
    );
  }

  getButtons(){
    if(this.data.type === 'confirm'){
      return (<div className="modal-footer">
        <button type="button" onClick={this.close.bind(this)} className="btn btn-default" data-dismiss="modal">取消</button>
        <button type="button" onClick={this.confirm.bind(this)} className="btn btn-primary">确定</button>
      </div>);
    }

    if(this.data.buttons.length === 0){
      return;
    }
    let btnList = this.data.buttons.map((item,i) => {
      return (<a href="###" onClick={item.callback} className={item.className} key={i}>{item.text}</a>);
    });
    return (
      <div className="btn-box modal-footer">
          {btnList}
      </div>
    );
  }


  getPanel(){
    let className = 'dialog-panel anim-modal';
    className += ' ' + (this.data.options.className || '');

    return (
      <div className={className}>
        <a href="###" onClick={this.close.bind(this)} className="close-btn"></a>
        {/*<h2 className="title">{this.data.title}</h2>*/}
        <div className="dialog-content">
            {this.data.content}
        </div>

      </div>
    );
  }

  getDialogContent(){
    switch(this.data.type){
      case 'alert':
        return this.getAlert();
      case 'confirm':
        return this.getConfirm();
      case 'panel':
        return this.getPanel();
    }
  }

  render(){
    let data = this.props.data;
    if(data.type === 'panel'){
      data = this.parsePanelData(data);
    }
    this.data = data;
    let clsName = classNames({
      'modal-dialog': true,
      [this.data.className]: true
    });
    return (
      <div>
      <div className='modal fade in'  style={{display: 'block'}}>
        <div className={clsName}>
          <div className="modal-content">
            <div className="modal-header">
              <button type="button" onClick={this.close.bind(this)} className="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span></button>
              <h4 className="modal-title">{this.data.title}</h4>
            </div>
            <div className="modal-body">
            {this.getDialogContent()}
            </div>
            {this.getButtons()}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade in"></div>
      </div>
    );
  }
}
