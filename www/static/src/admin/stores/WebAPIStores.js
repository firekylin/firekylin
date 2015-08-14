import Reflux from 'reflux';
import request from 'superagent';
import md5 from 'md5';

import CategoryActions from '../actions/CategoryActions';
import UserActions from '../actions/UserActions';
import PostActions from '../actions/PostActions';
import SystemActions from '../actions/SystemActions';


let buildCallback = function(action) {
  return function(error, response) {
    if (!response.ok) {
      action.failed((response.body && response.body.error) || response.error);
    } else if (response.body.status != 200) {
      action.failed(response.body.error);
    } else {
      action.completed(response.body);
    }

    if (response.body) {
      if (response.body.status == 401) {
        UserActions.showLogin();
      }
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
createRestfulStore('/admin/api/session', UserActions, {
  onLogin(username, password, captcha, autoLogin) {
    password = md5(`~!@#$${password}$#@!~`);
    request
      .post(this.getUrl())
      .type('form')
      .send({username, password, captcha, autoLogin})
      .end(buildCallback(UserActions.login));
  },
  onLogout() {
    request
        .del(this.getUrl())
        .end(buildCallback(UserActions.logout));
  },
  onCheck() {
    request
        .get(this.getUrl())
        .end(buildCallback(UserActions.check));
  }
});
