import Reflux from 'reflux';
import PostAction from '../actions/PostAction';


let PostStore = Reflux.createStore({

  listenables: PostAction,

  onLoadCompleted(response) {
    categories = response.data;
    this.trigger(categories);
  }

});


let PostListStore = Reflux.createStore({

  listenables: PostAction,
  list: [],

  onLoadCompleted(response) {
    this.list = response.data;
    this.trigger(this.list);
  }

});


let NewPostStore = Reflux.createStore({

  listenables: PostAction,
  status: 'init',

  onAddCompleted() {
    this.status = 'complete';
    this.trigger(this.status);
  },

  onAddFailed(error) {
    this.status = 'failed';
    this.trigger(this.status);
  }

});


export {PostStore, PostListStore, NewPostStore};
