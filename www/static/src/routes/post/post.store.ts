import { observable, action } from 'mobx';
import { message } from 'antd';
import { http } from '../../utils/http';
import { AppStore } from '../../app.store';
import { PostListRequestParams, PostListResponseData, PostInfo } from './post.model';
import { PaginationConfig } from 'antd/lib/table';
import { map } from 'rxjs/operators';
import { tools } from '../../utils/tools';

class PostStore {
  appStore;
  @observable loading = false;
  @observable postList = [];
  @observable postInfo: PostInfo = {
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
      post.statusText = tools.getStatusText(post.status, post.create_time);
    });
    this.postList = data; 
  }

  @action
  setPostInfo = info => {
    this.postInfo = Object.assign({}, this.postInfo, info);
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

  // 获取文章列表
  getPostList(): void {
    this.setLoading(true);
    http.get<PostListResponseData>('/admin/api/post', this.plReqParams)
      .pipe(
        map(
          res => {
            res.data.data.map((post, i) => {
              post.key = post.id;
              post.author = post.user.name;
              post.statusText = tools.getStatusText(post.status, post.create_time);
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

  // 删除文章
  deletePostById(id: number) {
    http.post<any>(`/admin/api/post/${id}?method=delete`)
      .subscribe(
        res => {
          if (res.errno === 0) {
              message.success('删除成功');
              this.getPostList();
          }
        },
        err => {
          message.error(err);
        }
      );
  }
  // 通过
  passPostById(id: number) {
    http.post<any>(`/admin/api/post/${id}?method=put`, {status: 3})
      .subscribe(
        res => {
          if (res.errno === 0) {
              message.success('通过成功');
              this.getPostList();
          }
        },
        err => {
          message.error(err);
        }
    );
  }

  // 拒绝
  refusePostById(id: number) {
    http.post<any>(`/admin/api/post/${id}?method=put`, {status: 2})
      .subscribe(
        res => {
          if (res.errno === 0) {
              message.success('拒绝成功');
              this.getPostList();
          }
        },
        err => {
          message.error(err);
        }
    );
  }
  // 重置
  resetPostInfo() {
    this.setPostInfo({
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
    });
  }
}

export default PostStore;
