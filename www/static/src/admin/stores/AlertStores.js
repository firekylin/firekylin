import Reflux from 'reflux';

import AlertActions from '../actions/AlertActions';


let AlertStore = Reflux.createStore({

  init() {
    ['success', 'info', 'warning', 'error'].forEach(type =>
        this.listenTo(AlertActions[type], this.alert.bind(this, type))
    )
  },

  alert(...args) {
    this.trigger(...args);
  }

});


export {AlertStore};
