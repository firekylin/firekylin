import React from 'react';
import {Promise} from 'es6-promise';
import autobind from 'autobind-decorator';
import classNames from 'classnames';

import Base from './base';
import ModalStore from '../store/modal';
import ModalActions from '../action/modal';
import thinkit from 'thinkit';

/**
 * 通用弹出层
 */
@autobind
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
      buttons = thinkit.extend([], options.buttons);
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
      'anim-modal': true,
      [this.data.className]: true
    });
    return (
      <div className={className}>
        <h2 className="title">{this.data.title}</h2>
        <div className="dialog-content">
            {this.data.content}
        </div>
        <div className="btn-box">
            <a href="###" onClick={this.close} className="btn-cancel">取消</a>
            <a href="###" onClick={this.confirm} className="btn-ok">确定</a>
        </div>
      </div>
    );
  }

  getPanelButtons(){
    if(this.data.buttons.length === 0){
      return;
    }
    let btnList = this.data.buttons.map(item => {
      return (<a href="###" onClick={item.callback} className={item.className}>{item.text}</a>);
    });
    return (
      <div className="btn-box">
          {btnList}
      </div>
    );
  }


  getPanel(){
    let className = 'dialog-panel anim-modal';
    className += ' ' + (this.data.options.className || '');

    return (
      <div className={className}>
        <a href="###" onClick={this.close} className="close-btn"></a>
        <h2 className="title">{this.data.title}</h2>
        <div className="dialog-content">
            {this.data.content}
        </div>
        {this.getPanelButtons()}
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

    return (
      <div className='dialog-wrap'>
        <div className="shadow"></div>
        {this.getDialogContent()}
    </div>
    );
  }
}