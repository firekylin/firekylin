import Reflux from 'reflux';
import moment from 'moment';

import PostActions from '../actions/PostActions';
import CategoryActions from '../actions/CategoryActions';
import {CategoryListStore} from './CategoryStores';
import apiHelper from '../utils/WebAPIHelper';


let PostStatusStore = apiHelper('/admin/api/post', PostActions);

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

  onLoadCompleted(response) {

    if (Array.isArray(response.data)) {
      this.list = response.data;
      this.list.forEach(item => {
        item.date = moment(item.date);
        item.modify_date = moment(item.modify_date);
      });
      this.trigger(this.list);
    }
  }

});


export {PostStore, PostListStore, PostStatusStore};
