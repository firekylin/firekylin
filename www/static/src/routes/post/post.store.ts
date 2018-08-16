import { observable, action } from 'mobx';
import { message } from 'antd';
import { tap } from 'rxjs/operators';
import { http } from '../../utils/http';
import { AppStore } from '../../app.store';
import { PostListRequestParams, PostListResponseData } from './post.model';
class PostStore {
  appStore;
  @observable loading = false;
  @observable postList;
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
      post.status = post.status;
    });
    this.postList = data; 
  }

  getPostList(params: PostListRequestParams): void {
    this.setLoading(true);
    http.get<PostListResponseData>('/admin/api/post', params)
      .pipe(
        tap(
          this.setLoading(false),
        )
      )
      .subscribe(
        res => {
          if (res.errno === 0) {
              this.setPostList(res.data.data);
          }
        },
        err => {
          message.error(err);
        }
      );
  }
}

export default PostStore;
