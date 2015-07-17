'use strict';

import React from 'react';
import Router from 'react-router';
import Bootstrap from 'react-bootstrap';

let {Popover, OverlayTrigger, Button, Glyphicon, ButtonToolbar, Alert, Modal, OverlayMixin} = Bootstrap;

class ConfirmPopoverContent extends React.Component {
  ok(){
    this.props.onRequestHide();
    this.props.ok();
  }
  render(){
    return (
      <Popover {...this.props} animation={true} title={this.props.title}>
        <div style={{padding: '10px 50px 20px 50px'}}>{this.props.content}</div>
        <ButtonToolbar style={{textAlign: 'center'}}>
          <Button bsSize='small' onClick={this.props.onRequestHide}>Close</Button>&nbsp;&nbsp;
          <Button bsSize='small' bsStyle='primary' onClick={this.ok.bind(this)}>{this.props.btn}</Button>
        </ButtonToolbar>
      </Popover>
    )
  }
}
/**
 * comfirm popover
 */
class ConfirmPopover extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      title: props.title || '删除',
      content: props.content || '确认删除么？',
      btn: props.btn || '确认'
    }
  }
  render(){
    return (
      <OverlayTrigger trigger='click' placement='top' overlay={<ConfirmPopoverContent ok={this.props.ok} title={this.state.title} content={this.state.content} btn={this.state.btn}/>}>
      {this.props.oriBtn}
      </OverlayTrigger>
    );
  }
}


let CustomModalTrigger = React.createClass({
  mixins: [OverlayMixin],
  getInitialState() {
    return {
      isModalOpen: false,
      title: '',
      content: '',
      callback: null,
      ok: ''
    };
  },
  componentDidMount(){
    on('modal_show', (event, data) => {
      data.isModalOpen = true;
      this.setState(data);
    })
  },
  handleToggle() {
    this.setState({
      isModalOpen: !this.state.isModalOpen
    });
  },
  confirm(){
    let ret = this.state.callback();
    Promise.resolve(ret).then((data) => {
      if(data !== false){
        this.handleToggle();
      }
    })
  },
  render() {
    if (!this.state.isModalOpen) {
      return <div/>;
    }
    let confirm = (<span />);
    if(this.state.callback){
      confirm = (<Button bsStyle='primary' onClick={this.confirm} >{this.state.ok || '确定'}</Button>);
    }
    return (
      <Modal title={this.state.title} onRequestHide={this.handleToggle}>
        <div className='modal-body'>
          {this.state.content}
        </div>
        <div className='modal-footer'>
          <Button onClick={this.handleToggle}>关闭</Button>
          {confirm}
        </div>
      </Modal>
    );
  },
  // This is called by the `OverlayMixin` when this component
  // is mounted or updated and the return value is appended to the body.
  renderOverlay() {
    return this.render();
  }
});

let alertModal = function(title, content, callback, ok){
  let data;
  if(typeof title === 'object'){
    data = title;
  }else{
    data = {
      title: title, 
      content: content,
      callback: callback,
      ok: ok
    }
  }
  trigger('modal_show', data);
}

/**
 * 错误提示
 */
class Tip extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      alertVisible: false,
      alertContent: '',
      alertType: 'danger'
    }
    //错误提示信息
    on('tip', (event, data) => {
        if(typeof data === 'string'){
            data = {content: data};
        }
        this.setState({
            alertVisible: true,
            alertContent: data.content,
            alertType: data.type || 'danger'
        })
        this.callback = data.callback;
    })
  }
  dismiss(){
    this.setState({alertVisible: false});
    if(this.callback){
      this.callback();
      this.callback = null;
    }
  }
  render(){
    if(this.state.alertVisible){
      return (
        <Alert bsStyle={this.state.alertType} onDismiss={this.dismiss.bind(this)} dismissAfter={1500}>
          <p>{this.state.alertContent}</p>
        </Alert>
      )
    }
    return (<div></div>);
  }
}
/**
 * 显示错误提示框
 * @param  {[type]} content [description]
 * @param  {[type]} type    [description]
 * @return {[type]}         [description]
 */
function showTip(content, type, callback){
  if(type === true){
    type = 'success';
  }
  if(typeof type === 'function'){
    callback = type;
    type = '';
  }
  trigger('tip', {
    content: content,
    type: type,
    callback: callback
  })
}

//event
let _window = $(window);
function on(event, callback){
  _window.on(event, callback);
}
function trigger(event, data){
  _window.trigger(event, data);
}
/**
 * upload file
 * @return {[type]} [description]
 */
function upload(url, data){
  let form = new FormData();
  for(let key in data){
    form.append(key, data[key]);
  }
  let xhr = new XMLHttpRequest();
  let deferred = $.Deferred();
  xhr.onreadystatechange = function(){
    if(xhr.readyState === 4){
      if(xhr.status === 200){
        let text = xhr.responseText;
        let data = JSON.parse(text);
        deferred.resolve(data);
      }else{
        deferred.reject(xhr);
      }
    }
  }
  xhr.open('POST', url, true);
  xhr.send(form);
  return deferred;
}

export default {
  ConfirmPopover: ConfirmPopover,
  Tip: Tip,
  tip: showTip,
  alertModal: alertModal,
  confirmModal: alertModal,
  CustomModal: CustomModalTrigger,
  on: on,
  trigger: trigger,
  upload: upload
}