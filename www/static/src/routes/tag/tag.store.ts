import { message } from 'antd';
import { http } from '../../utils/http';
import { AppStore } from '../../app.store';
import { observable, action } from 'mobx';
import { map, tap } from 'rxjs/operators';
import { Tag } from '../../models/tag.model';

class TagStore {
  appStore: AppStore;
  @observable tag: Tag;

  constructor(appStore: AppStore) {
    this.appStore = appStore;
  }

  @action
  setTag = (data: Tag) => this.tag = data

  // 删除标签
  tagDelete(id: number) {
    http.post<Tag[]>(`/admin/api/tag/${id}?method=delete`)
      .subscribe(
        res => {
          if (res.errno === 0) {
              message.success('删除成功');
              this.appStore.sharedStore.getTagList();
          }
        },
        err => {
          message.error(err);
        }
      );
  }
  // 创建标签
  tagCreate(params: any) {
    return http.post<any>('/admin/api/tag', params)
      .pipe(
        map(res => {
          if (res.errno === 0) {
            message.success('创建成功');
          }
          return res;
        })
      );
  }
  // 更新标签
  tagUpdate(id: string, params: any) {
    return http.post<any>(`/admin/api/tag/${id}?method=put`, params)
      .pipe(
        tap(res => {
          if (res.errno === 0) {
            message.success('更新标签成功');
          } else {
            message.error(res.errmsg);
          }
        })
      );
  }
  // 获取标签信息
  getTagById(id: string) {
    http.get<any, {name: string}>(`/admin/api/tag/${id}`)
      .subscribe(
        res => {
          if (res.errno !== 0) {
            message.error(res.errmsg.name);
          } else {
            this.setTag(res.data);
          }
        },
        err => {
          message.error(err);
        }
      );
  }
}

export default TagStore;
