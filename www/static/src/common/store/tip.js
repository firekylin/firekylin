import Reflux from 'reflux';

import TipActions from '../action/tip';
import firekylin from '../util/firekylin';


export default Reflux.createStore({

  listenables: TipActions,

  clear: function(timeout){
    clearTimeout(this.timer);
    if(this.deferred){
      this.deferred.resolve();
    }
    let deferred = firekylin.defer();
    this.timer = setTimeout(() => {
      this.trigger({isOpen: false});
      deferred.resolve();
    }, timeout || 1500);
    this.deferred = deferred;
    return deferred.promise;
  },

  /**
   * 成功
   * @param  {[type]} text [description]
   * @return {[type]}      [description]
   */
  onSuccess: function(text, timeout){
    this.trigger({
      type: 'success',
      text: text || '操作成功',
      isOpen: true
    });
    return this.clear(timeout);
  },
  /**
   * 失败
   * @param  {[type]} text [description]
   * @return {[type]}      [description]
   */
  onFail: function(text, timeout){
    this.trigger({
      type: 'danger',
      text: text || '操作失败',
      isOpen: true
    });
    return this.clear(timeout);
  }
});