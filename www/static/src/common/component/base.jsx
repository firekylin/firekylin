import React from 'react';
//import autobind from 'autobind-decorator';

import { decorate as mixin } from 'react-mixin';
import { ListenerMixin } from 'reflux';
import ModalActions from '../action/modal';

import { Router } from 'react-router';

@mixin(ListenerMixin)
class Base extends React.Component {

  static contextTypes = {
    router: () => React.PropTypes.func.isRequired
  };

  constructor(props, context){
    super(props, context);
    this.state = {};
    this.__stores = [];
    this.__listens = [];
  }

  componentDidMount(){
    
  }
  /**
   * redirect route
   * @param  {String} route []
   * @return {void}       []
   */
  redirect(route){
    this.context.router.push(route);
  }

  _getStoreIndex(store){
    let index = this.__stores.indexOf(store);
    if(index > -1){
      return index;
    }
    this.__stores.push(store);
    return this.__stores.length - 1;
  }
  /**
   * listen store data change
   * @param  {[type]}   store    []
   * @param  {[type]}   type     []
   * @param  {Function} callback []
   * @return {[type]}            []
   */
  listen(store, callback, type){
    let index = this._getStoreIndex(store);
    if(!this.__listens[index]){
      this.__listens[index] = [];
      //添加监听
      this.listenTo(store, (data, triggerType) => {
        this.__listens[index].forEach(fn => {
          fn(data, triggerType);
        });
      });
    }

    this.__listens[index].push((data, triggerType) => {
      if(type && type === triggerType || !type){
        callback.bind(this)(data, triggerType);
      }
    });
  }
};


export default Base;