import { observable, action } from 'mobx';
import { message } from 'antd';
import { http } from '../../utils/http';
import { AppStore } from '../../app.store';
import { PostListRequestParams, PostListResponseData } from './post.model';
import { PaginationConfig } from 'antd/lib/table';
import { map } from 'rxjs/operators';

const isFuture = time => time && (new Date(time)).getTime() > Date.now();
function getStatusText(status: number, createTime: Date) {
    let statusText = '未知';
    switch (status) {
      case 0: statusText = '草稿'; break;
      case 1: statusText = '待审核'; break;
      case 2: statusText = '已拒绝'; break;
      case 3:
        statusText = isFuture(createTime) ? '即将发布' : '已发布';
        break;
      default:
    }
    return statusText;
}
class PostStore {
  appStore;
  @observable loading = false;
  @observable postList;
  @observable pagination: PaginationConfig = {
    current: 1,
    pageSize: 0,
    total: 0,
  };
  @observable plReqParams: PostListRequestParams = {
    page: 1,
    status: '',
    keyword: '',
    cate: ''
  };

  constructor(appStore: AppStore) {
    this.appStore = appStore;
  }

  @action
  setLoading = data => this.loading = data

  @action
  setPostList = data => {
    data.map((post, i) => {
      post.key = post.id;
      post.author = post.user.name;
      post.statusText = getStatusText(post.status, post.create_time);
    });
    this.postList = data; 
  }

  @action 
  setPagination = (pagination: PaginationConfig) => {
    this.pagination = pagination;
  }

  @action
  setPlReqParams = (params: PostListRequestParams) => {
    this.plReqParams = Object.assign(this.plReqParams, params);
    this.getPostList();
  }

  getPostList(): void {
    this.setLoading(true);
    http.get<PostListResponseData>('/admin/api/post', this.plReqParams)
      .pipe(
        map(
          res => {
            res.data.data.map((post, i) => {
              post.key = post.id;
              post.author = post.user.name;
              post.statusText = getStatusText(post.status, post.create_time);
            });
            return res;
          }
        )
      )
      .subscribe(
        res => {
          if (res.errno === 0) {
              this.setPostList(res.data.data);
              this.setPagination({
                current: res.data.currentPage,
                pageSize: res.data.pageSize,
                total: res.data.count
              });
              this.setLoading(false);
          }
        },
        err => {
          message.error(err);
          this.setLoading(false);
        }
      );
  }
}

export default PostStore;
