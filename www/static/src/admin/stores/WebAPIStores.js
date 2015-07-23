import Reflux from 'reflux';
import request from 'superagent';

import CategoryAction from '../actions/CategoryAction';
import PostAction from '../actions/PostAction';


let buildCallback = function(action) {
  return function(error, response) {
    if (response.ok) {
      action.completed(response.body);
    } else {
      action.failed(response.body || response.error);
    }
  };
};

Reflux.createStore({
  url: '/admin/api/category',
  listenables: CategoryAction,

  onLoad() {
    request
        .get(this.url)
        .end(buildCallback(CategoryAction.load));
  },

  onAdd() {
    request
        .post(this.url)
        .end(buildCallback(CategoryAction.add));
  }
});

Reflux.createStore({
  url: '/admin/api/post',
  listenables: PostAction,

  onLoad() {
    request
        .get(this.url)
        .end(buildCallback(PostAction.load));
  },

  onAdd(data) {
    request
        .post(this.url)
        .type('form')
        .send(data)
        .end(buildCallback(PostAction.add));
  }
});