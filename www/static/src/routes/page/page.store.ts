import { observable, action } from 'mobx';
import { http } from '../../utils/http';
import { message } from 'antd';
import { map, tap } from 'rxjs/operators';
import { tools } from '../../utils/tools';

class PageStore {
  @observable loading = false;
  @observable pageList = [];
  @observable pagination = {};

  @action
  setPageList = data => this.pageList = data

  @action
  setLoading = data => this.loading = data

  getPageList(page: string): void {
    this.setLoading(true);
    http.get<any[]>('/admin/api/page', {page})
      .pipe(
        map(res => {
          res.data.map((item, key) => {
            item.key = item.id;
            item.author = item.user.name;
            item.statusText = tools.getStatusText(item.status, item.create_time);
          });
          return res;
        })
      )
      .subscribe(
        res => {
          if (res.errno === 0) {
            this.setPageList(res.data);
            this.setLoading(false);
          } else {
            this.setLoading(false);
          }
        },
        err => {
          message.error(err);
          this.setLoading(false);
        }
      );
  }

  pageDeleteById(id: number) {
    // 
  }
}

export default PageStore;
