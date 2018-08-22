// import { observable, action } from 'mobx';
import { message } from 'antd';
import { http } from '../../utils/http';
import { AppStore } from '../../app.store';
import { CategoryCreateParams } from './category.model';

class CategoryStore {
  appStore;

  constructor(appStore: AppStore) {
    this.appStore = appStore;
  }

  // 删除标签
  deleteCategoryId(id: number) {
    http.post<any>(`/admin/api/cate/${id}?method=delete`)
      .subscribe(
        res => {
          if (res.errno === 0) {
              message.success('删除成功');
              this.appStore.sharedStore.getCategoryList();
          }
        },
        err => {
          message.error(err);
        }
      );
  }
  // 创建标签
  createCategory(params: CategoryCreateParams) {
    http.post<any>('/admin/api/cate', params)
      .subscribe(
        res => {
          if (res.errno === 0) {
              message.success('创建成功');
              this.appStore.sharedStore.getCategoryList();
          }
        },
        err => {
          message.error(err);
        }
      );
  }
}

export default CategoryStore;
