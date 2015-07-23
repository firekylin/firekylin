import Reflux from 'reflux';
import CategoryAction from '../actions/CategoryAction';


let CategoryListStore = Reflux.createStore({

  listenables: CategoryAction,
  list: [],

  onLoadCompleted(response) {
    this.list = response.data;
    this.trigger(this.list);
  }


});


export {CategoryListStore};