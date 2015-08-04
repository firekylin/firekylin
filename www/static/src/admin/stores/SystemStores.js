import Reflux from 'reflux';

import SystemActions from '../actions/SystemActions';


let SystemStore = Reflux.createStore({

  listenables: SystemActions,

  onLoadCompleted(response) {
    this.trigger(response.data);
  }

});

export { SystemStore };
