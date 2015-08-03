import Reflux from 'reflux';

import AlertActions from '../actions/AlertActions';


let AlertStore = Reflux.createStore({

  listenables: AlertActions,

  init() {
    let self = this;
    ['success', 'info', 'warning', 'error'].forEach(type =>
        self.listenTo(AlertActions[type], self.alert.bind(self, type))
    )
  },

  alert(...args) {
    this.trigger(...args);
  }

});


export {AlertStore};
