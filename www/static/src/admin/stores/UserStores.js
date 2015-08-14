import Reflux from 'reflux';

import UserActions from '../actions/UserActions';


let UserStore = Reflux.createStore({

  listenables: UserActions,

  onLoginCompleted(response) {
    this.trigger(response.data);
  },

  onLoginFailed() {
    this.trigger(null);
  },

  onLogoutCompleted(response) {
    this.trigger(null);
  },

  onCheckCompleted(response) {
    this.trigger(response.data);
  },

  onCheckFailed(response) {
    this.trigger(null);
  }

});


export {UserStore};
