import Reflux from 'reflux';
import CategoryActions from '../actions/CategoryActions';


let CategoryListStore = Reflux.createStore({

  listenables: CategoryActions,
  list: [],

  onLoadCompleted(response) {
    this.list = response.data;
    this.trigger(this.list);
  }


});

let CategoryStatusStore = Reflux.createStore({

  listenables: CategoryActions,
  status: 'init',

  init() {
    this.listenTo(CategoryActions.add.completed, this.onCompleted);
    this.listenTo(CategoryActions.update.completed, this.onCompleted);
    this.listenTo(CategoryActions.delete.completed, this.onCompleted);

    this.listenTo(CategoryActions.add.failed, this.onFailed);
    this.listenTo(CategoryActions.update.failed, this.onFailed);
    this.listenTo(CategoryActions.delete.failed, this.onFailed);
  },

  onCompleted() {
    this.status = 'complete';
    this.trigger(this.status);

    CategoryActions.load();
  },

  onFailed(error) {
    this.status = 'failed';
    this.trigger(this.status, error);
  }

});

export {CategoryListStore, CategoryActions, CategoryStatusStore};