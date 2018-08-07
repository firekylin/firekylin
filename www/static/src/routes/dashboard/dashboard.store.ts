import { observable, action } from 'mobx';
import { AppStore } from '../../app.store';

class DashBoardStore {
  appStore;
  @observable data = [];
  constructor(appStore: AppStore) {
    this.appStore = appStore;
  }

  @action
  setData = data => this.data = data

}

export default DashBoardStore;
