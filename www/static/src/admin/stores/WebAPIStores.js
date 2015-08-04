import Reflux from 'reflux';
import request from 'superagent';

import CategoryActions from '../actions/CategoryActions';
import UserActions from '../actions/UserActions';
import PostActions from '../actions/PostActions';
import SystemActions from '../actions/SystemActions';


let buildCallback = function(action) {
  return function(error, response) {
    if (response.ok) {
      action.completed(response.body);
    } else {
      action.failed((response.body && response.body.error) || response.error);
    }
  };
};


let createRestfulStore = function(url, Actions, ext = {}) {
  return Reflux.createStore(Object.assign({
    url: url,
    listenables: Actions,

    getUrl(id) {
      if (id) {
        id = Array.isArray(id) ? id.join() : id;
        return `${this.url}/${id}`;
      } else {
        return this.url;
      }

    },

    onLoad(id) {
      request
          .get(this.getUrl(id))
          .end(buildCallback(Actions.load));
    },

    onAdd(data) {
      request
          .post(this.getUrl())
          .type('form')
          .send(data)
          .end(buildCallback(Actions.add));
    },

    onUpdate(id, data) {
      request
          .put(this.getUrl(id))
          .type('form')
          .send(data)
          .end(buildCallback(Actions.update));
    },

    onDelete(id) {
      request
          .del(this.getUrl(id))
          .end(buildCallback(Actions.delete));
    }
  }, ext));
};

createRestfulStore('/admin/api/category', CategoryActions);
createRestfulStore('/admin/api/post', PostActions);
createRestfulStore('/admin/api/system', SystemActions);
