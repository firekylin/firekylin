import Reflux from 'reflux';

import DialogActions from '../actions/DialogActions';


let DialogModalStore = Reflux.createStore({

  listenables: DialogActions,

  onPrompt(message, opts) {
    opts.buttons = [
      { name: '确定', value: true, primary: true },
      { name: '取消', value: false }
    ];
    this.onModal(message, opts);
  },

  onModal(message, opts) {
    this.trigger(message, opts);
  }

});

let DialogStore = Reflux.createStore({

  listenables: DialogActions,


});


export { DialogModalStore, DialogStore };
