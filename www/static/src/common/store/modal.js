import Reflux from 'reflux';

import ModalActions from '../action/modal';

export default Reflux.createStore({

  listenables: ModalActions,
  /**
   * modal的id
   * @type {Number}
   */
  idx: 100,
  /**
   * 存放modal的列表
   * @type {Array}
   */
  modalList: [],
  /**
   * 添加一个弹出层
   * @param {[type]} data [description]
   */
  add: function(data){
    let idx = this.idx++;
    data.idx = idx;

    this.modalList.push(data);
    this.trigger(this.modalList, 'modalList');

    return idx;
  },
  /**
   * 删除一个弹出层
   * @param  {[type]} index [description]
   * @return {[type]}       [description]
   */
  remove: function(idx){
    this.modalList = this.modalList.filter(item => {
      return item.idx !== idx;
    });
    this.trigger(this.modalList, 'modalList');
  },
  /**
   * 关闭一个弹出层
   * @param  {[type]} idx [description]
   * @return {[type]}     [description]
   */
  onRemove: function(idx){
    this.remove(idx);
  },
  /**
   * 弹出面板
   * @param  {[type]} title   [description]
   * @param  {[type]} content [description]
   * @param  {[type]} options [description]
   * @return {[type]}         [description]
   */
  onPanel: function(title, content, options){
    let data = {
      type: 'panel',
      title: title,
      content: content,
      options: options || {}
    };
    let idx = this.add(data);
    ModalActions.panel.completed(idx);
  },
  /**
   * confirm
   * @param  {[type]} text [description]
   * @return {[type]}      [description]
   */
  onConfirm: function(title, content, callback, className, options){
    let data = {
      type: 'confirm',
      title: title,
      content: content,
      callback: callback,
      className: className || '',
      options: options||{}
    };
    let idx = this.add(data);
    ModalActions.confirm.completed(idx);
  },
  /**
   * 失败
   * @param  {[type]} text [description]
   * @return {[type]}      [description]
   */
  onAlert: function(title, content){
    let data = {
      type: 'alert',
      title: title,
      content: content
    };
    let idx = this.add(data);
    ModalActions.alert.completed(idx);
  }
});
