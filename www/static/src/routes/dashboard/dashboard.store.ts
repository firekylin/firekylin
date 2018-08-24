import { observable, action } from 'mobx';
import { AppStore } from '../../app.store';
import superagent from 'superagent';
import firekylin from '../../utils/firekylin';
import { http } from '../../utils/http';
import { SystemInfo } from './dashboard.model';

class DashBoardStore {
  appStore;
  @observable posts = [];
  @observable systemInfo: SystemInfo = {
    config: {},
    count: {
      cates: 0,
      comments: 0,
      posts: 0,
    },
    versions: {
      platform: '',
      nodeVersion: '',
      v8Version: '',
      mysqlVersion: '',
      thinkjsVersion: '',
      firekylinVersion: '',
      needUpdate: ''
    }
  };
  constructor(appStore: AppStore) {
    this.appStore = appStore;
  }

  @action
  setPosts = data => this.posts = data

  @action
  setSystemInfo = systemInfo => this.systemInfo = systemInfo

  getSelectLast() {
    let req = superagent.get('/admin/api/post?type=lastest');
    return firekylin.request(req).then(
      data => this.setPosts(data)
    );
  }

  getSystemInfo() {
    http.get<SystemInfo>('/admin/api/system')
    .subscribe(
      res => {
        this.setSystemInfo(res.data);
      }
    );
  }

}

export default DashBoardStore;
