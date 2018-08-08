import { observable, action } from 'mobx';
import { AppStore } from '../../app.store';
import superagent from 'superagent';
import firekylin from '../../utils/firekylin';

class DashBoardStore {
  appStore;
  @observable posts = [];
  constructor(appStore: AppStore) {
    this.appStore = appStore;
  }

  @action
  setPosts = data => this.posts = data

  getSelectLast() {
    let req = superagent.get('/admin/api/post?type=lastest');
    return firekylin.request(req).then(
      data => this.setPosts(data)
    );
  }

}

export default DashBoardStore;
