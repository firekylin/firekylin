import Reflux from 'reflux';

import CategoryActions from '../actions/CategoryActions';
import apiHelper from '../utils/WebAPIHelper';


let CategoryStatusStore = apiHelper('/admin/api/category', CategoryActions);

let CategoryListStore = Reflux.createStore({

  listenables: CategoryActions,
  list: [],

  onLoadCompleted(response) {
    this.list = response.data;
    this.trigger(this.list);
  }


});

export { CategoryListStore, CategoryActions, CategoryStatusStore };