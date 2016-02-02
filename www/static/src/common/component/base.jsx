import React from 'react';
//import autobind from 'autobind-decorator';
import { Navigation as RouteNavigation } from 'react-router';
import { decorate as mixin } from 'react-mixin';
import { ListenerMixin } from 'reflux';
import ModalActions from '../action/modal';

//@mixin(RouteNavigation)
// @mixin(ListenerMixin)
class Base extends React.Component {

  constructor(props){
    super(props);
    this.state = {};
    this.__stores = [];
    this.__listens = [];
  }

  componentDidMount(){
    //window.addEventListener('offline',this.offline,true);
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
}

export default Base;