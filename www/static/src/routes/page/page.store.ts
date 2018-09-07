import { observable, action } from 'mobx';
import { http } from '../../utils/http';
import { message } from 'antd';
import { map, tap } from 'rxjs/operators';
import { tools } from '../../utils/tools';
import { String } from 'aws-sdk/clients/sns';
import { PageInfo } from './page.model';

class PageStore {
  @observable loading = false;
  @observable page = '1';
  @observable pageList = [];
  @observable pagination = {};
  @observable pageInfo: PageInfo = {
    title: '',
    pathname: '',
    markdown_content: '',
    tag: [],
    cate: [],
    is_public: '1',
    create_time: new Date().toUTCString(),
    allow_comment: true,
    options: {
      template: '',
      featuredImage: '',
      push_sites: []
    },
    status: 1,
    user_id: '',
  };

  @action
  setPageList = data => this.pageList = data

  @action
  setPage = page => this.page = page

  @action
  setLoading = data => this.loading = data

  getPageList(): void {
    this.setLoading(true);
    http.get<any[]>('/admin/api/page', {page: this.page})
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

  pageDeleteById(id: String) {
    http.post<any>(`/admin/api/page/${id}?method=delete`)
    .subscribe(
      res => {
        if (res.errno === 0) {
          message.success('删除成功');
          this.getPageList();
        }
      }
    );
  }
}

export default PageStore;
