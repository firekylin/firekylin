import Reflux from 'reflux';
import moment from 'moment';

import PostActions from '../actions/PostActions';
import CategoryActions from '../actions/CategoryActions';
import {CategoryListStore} from './CategoryStores';


let PostStore = Reflux.createStore({

  listenables: PostActions,

  onLoadCompleted(response) {
    let data = response.data;
    if (!Array.isArray(data)) {
      data.date = moment(data.date);
      data.modify_date = moment(data.modify_date);
      this.trigger(data);
    }
  }

});


let PostListStore = Reflux.createStore({

  listenables: PostActions,
  list: [],
  categoryMap: {},

  init() {
    CategoryActions.load();
    this.listenTo(CategoryListStore, 'onCategoryUpdate');
  },

  onLoadCompleted(response) {
    let categoryMap = this.categoryMap;

    if (Array.isArray(response.data)) {
      this.list = response.data;
      this.list.forEach(item => {
        item.date = moment(item.date);
        item.modify_date = moment(item.modify_date);
        item.category = categoryMap[item.category_id];
      });
      this.trigger(this.list);
    }
  },

  onCategoryUpdate(list) {
    let categoryMap = this.categoryMap;
    list.forEach(item => {
      categoryMap[item.id] = item.name;
    });
    this.trigger(this.list);
  }

});


let PostStatusStore = Reflux.createStore({

  listenables: PostActions,
  status: 'init',

  init() {
    this.listenTo(PostActions.add.completed, this.onCompleted);
    this.listenTo(PostActions.update.completed, this.onCompleted);
    this.listenTo(PostActions.delete.completed, this.onCompleted);

    this.listenTo(PostActions.add.failed, this.onFailed);
    this.listenTo(PostActions.update.failed, this.onFailed);
    this.listenTo(PostActions.delete.failed, this.onFailed);
  },

  onCompleted() {
    this.status = 'complete';
    this.trigger(this.status);

    PostActions.load();
  },

  onFailed(error) {
    this.status = 'failed';
    this.trigger(this.status);
  }

});


export {PostStore, PostListStore, PostStatusStore};
