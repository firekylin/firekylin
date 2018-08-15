import { observable, action } from 'mobx';
import { AppStore } from '../../app.store';
import { http } from '../../utils/http';
import { message } from 'antd';
import { tap } from 'rxjs/operators';
import { PostRequestParams } from './post.model';

class PostStore {
  appStore;
  @observable loading = false;
  constructor(appStore: AppStore) {
    this.appStore = appStore;
  }

  @action
  setLoading = data => this.loading = data

  getPostList(params: PostRequestParams): void {
    this.setLoading(true);
    http.get<''>('/admin/api/post', params)
      .pipe(
        tap(
          this.setLoading(false),
        )
      )
      .subscribe(
        res => {
          if (res.errno === 0) {
                //
          } else {
            message.error(res.errmsg);
          }
        },
        err => {
          message.error(err);
        }
      );
  }
}

export default PostStore;
