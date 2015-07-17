'use strict';
var firekylin = {};

import React from 'react';
import Router from 'react-router';
import Bootstrap from 'react-bootstrap';

import Pager from './pager.jsx';

/**
 * create class
 * @return {[type]} [description]
 */
firekylin.createClass = function(methods){
  //merge mixins
  var mixins = methods.mixins;
  if(mixins){
    mixins = [Router.Navigation]
  }else{
    mixins = $.extend([Router.Navigation], mixins);
  }
  methods.mixins = mixins;
  /**
   * redirect url
   * @param  {[type]} url [description]
   * @return {[type]}     [description]
   */
  methods.redirect = function(url){
    return this.transitionTo(url);
  }
  /**
   * on event
   * @param  {[type]}   event    [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  methods.on = function(event, callback){
    firekylin.eventBinding.on(event, callback);
  }
  /**
   * trigger event
   * @param  {[type]}   event    [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  methods.trigger = function(event, callback){
    firekylin.eventBinding.trigger(event, callback);
  }
  /**
   * ajax request
   * @param  {[type]} url    [description]
   * @param  {[type]} method [description]
   * @param  {[type]} data   [description]
   * @return {[type]}        [description]
   */
  methods.ajax = function(url, method, data){
    if(typeof method === 'object'){
      data = methods;
      method = 'GET';
    }
    return $.ajax({
      url: url,
      method: method || 'GET',
      data: data
    }).done(function(result){
      if(result.errno){
        firekylin.tip(result.errmsg);
        return;
      }
      return result.data;
    }).fail(function(err){
      firekylin.tip(err);
    })
  }
  /**
   * show tip
   * @param  {[type]}   message  [description]
   * @param  {[type]}   type     [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  methods.tip = function(message, type, callback){
    return firekylin.tip(message, type, callback);
  }

  return React.createClass(methods);
}
/**
 * React Object
 * @type {[type]}
 */
firekylin.React = React;
/**
 * Bootstrap
 * @type {[type]}
 */
firekylin.Bootstrap = Bootstrap;
/**
 * event binding object
 * @type {[type]}
 */
firekylin.eventBinding = $(firekylin);
/**
 * pagenation
 * @type {[type]}
 */
firekylin.Pager = Pager;

/**
 * local
 * @param  {[type]} name [description]
 * @return {[type]}      [description]
 */
firekylin._ = function(name){
  return name;
}
/**
 * [createClass description]
 * @param  {[type]} options.propTypes: {                                          onRequestHide: React.PropTypes.func,                    ok: React.PropTypes.func,    btn: React.PropTypes.string,    title: React.PropTypes.string,    content: React.PropTypes.string [description]
 * @param  {[type]} ok(){                             this.props.onRequestHide();                                       this.props.ok();  }  [description]
 * @param  {[type]} render(            [description]
 * @return {[type]}                    [description]
 */
firekylin.ConfirmPopoverContent = firekylin.createClass({
  propTypes: {
    onRequestHide: React.PropTypes.func,
    ok: React.PropTypes.func,
    btn: React.PropTypes.string,
    title: React.PropTypes.string,
    content: React.PropTypes.string
  },
  ok(){
    this.props.onRequestHide();
    this.props.ok();
  },
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
})
/**
 * [createClass description]
 * @param  {[type]} {             
 * @return {[type]}    [description]
 */
firekylin.ConfirmPopover = firekylin.createClass({
  propTypes: {
    ok: React.PropTypes.string,
    title: React.PropTypes.string,
    content: React.PropTypes.string,
    btn: React.PropTypes.string
  },
  getInitialState(){
    return {
      title: this.props.title || '删除',
      content: this.props.content || '确认删除么？',
      btn: this.props.btn || '确认'
    }
  },
  render(){
    var ConfirmPopoverContent = firekylin.ConfirmPopoverContent;
    return (
      <OverlayTrigger trigger='click' placement='top' overlay={<ConfirmPopoverContent ok={this.props.ok} title={this.state.title} content={this.state.content} btn={this.state.btn}/>}>
      {this.props.oriBtn}
      </OverlayTrigger>
    );
  }
})

firekylin.Tip = firekylin.createClass({
  getInitialState(){
    return {
      alertVisible: false,
      alertContent: '',
      alertType: 'danger'
    }
  },
  componentDidMount(){
    this.on('tip', (event, data) => {
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
  },
  dismiss(){
    this.setState({alertVisible: false});
    if(this.callback){
      this.callback();
      this.callback = null;
    }
  },
  render(){
    if(this.state.alertVisible){
      return (
        <Alert bsStyle={this.state.alertType} onDismiss={this.dismiss.bind(this)} dismissAfter={1500}>
          <p>{this.state.alertContent}</p>
        </Alert>
      )
    }
    return (<div class="tip-container"></div>);
  }
})
/**
 * show error message
 * @param  {[type]} message [description]
 * @param  {[type]} success [description]
 * @return {[type]}         [description]
 */
firekylin.tip = function(message, type, callback){
  if(type === true){
    type = 'success';
  }
  if(typeof type === 'function'){
    callback = type;
    type = '';
  }
  firekylin.eventBinding.trigger('tip', {
    content: message,
    type: type,
    callback: callback
  })
};
/**
 * Custom Modal
 * @param  {[type]} options.mixins:           [OverlayMixin] [description]
 * @param  {[type]} options.getInitialState() {                                             return           {                                          isModalOpen:            false,            title:        '',      content: '',      callback: null,      ok: ''    }; [description]
 * @param  {[type]} componentDidMount(){                                   on('modal_show', (event,          data)         [description]
 * @param  {[type]} handleToggle()            {                                             this.setState({                                isModalOpen: !this.state.isModalOpen          });  } [description]
 * @param  {[type]} confirm(){                                             let              ret              [description]
 * @return {[type]}                           [description]
 */
firekylin.CustomModal = firekylin.createClass({
  mixins: [Bootstrap.OverlayMixin],
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
    this.on('modal_show', (event, data) => {
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
      return <div />;
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
/**
 * alert Modal
 * @param  {[type]}   title    [description]
 * @param  {[type]}   content  [description]
 * @param  {Function} callback [description]
 * @param  {[type]}   ok       [description]
 * @return {[type]}            [description]
 */
firekylin.alertModal = function(title, content, callback, ok){
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
  firekylin.eventBinding.trigger('modal_show', data);
}

export default firekylin;