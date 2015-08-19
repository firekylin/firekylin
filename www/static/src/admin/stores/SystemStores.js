import Reflux from 'reflux';
import request from 'superagent';

import SystemActions from '../actions/SystemActions';
import apiHelper from '../utils/WebAPIHelper';


let SystemStatusStore = apiHelper('/admin/api/system', SystemActions, {
  onUpdate(data) {
    let url = this.getUrl();
    this.cache.clear(url);
    request
        .put(url)
        .type('form')
        .send(data)
        .end(this.callback(SystemActions.update, url));
  }
});

let SystemStore = Reflux.createStore({

  listenables: SystemActions,

  onLoadCompleted(response) {
    this.trigger(response.data);
  }
});

export { SystemStore, SystemStatusStore };
