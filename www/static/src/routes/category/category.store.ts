import { message } from 'antd';
import { http } from '../../utils/http';
import { AppStore } from '../../app.store';
import { observable, action } from 'mobx';
import { CategoryCreateParams } from './category.model';
import { map, tap } from 'rxjs/operators';
import { Category } from '../../models/category.model';

class CategoryStore {
  appStore: AppStore;
  @observable rootCategoryList: Category[] = [];
  @observable categoryInfo: Category;

  constructor(appStore: AppStore) {
    this.appStore = appStore;
  }

  @action
  setRootCategoryList = (data: Category[]) => this.rootCategoryList = data

  @action
  setCurrentCatInfo = (data: Category) => this.categoryInfo = data

  // 删除分类
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
  // 创建分类
  createCategory(params: CategoryCreateParams) {
    return http.post<any>('/admin/api/cate', params)
      .pipe(
        map(res => {
          if (res.errno === 0) {
            message.success('创建成功');
          }
          return res;
        })
      );
  }
  // 更新分类信息
  updateCategory(id: string, params: CategoryCreateParams) {
    return http.post<any>(`/admin/api/cate/${id}?method=put`, params)
      .pipe(
        tap(res => {
          if (res.errno === 0) {
            message.success('更新分类成功');
          } else {
            message.error(res.errmsg);
          }
        })
      );
  }
  // 设置默认分类
  setDefaultCategory(id: number) {
    http.post<any>('/admin/api/options?type=defaultCategory&method=put', {id})
      .subscribe(
        res => {
            message.success('设置默认分类成功');
            this.appStore.sharedStore.getDefaultCategory();
        },
        err => {
          message.error(err);
        }
      );
  }
  // 获取分类信息
  getCategoryInfoById(id: string) {
    http.get<any, {name: string}>(`/admin/api/cate/${id}`)
      .subscribe(
        res => {
          if (res.errno !== 0) {
            message.error(res.errmsg.name);
          } else {
            this.setCurrentCatInfo(res.data);
          }
        },
        err => {
          message.error(err);
        }
      );
  }
  // 获取pid = 0的根类别
  getRootCategory() {
    http.get<any>('/admin/api/cate?pid=0')
      .subscribe(
        res => {
          if (res.errno === 0) {
            this.setRootCategoryList(res.data);
          }
        },
        err => {
          message.error(err);
        }
      );
  }
}

export default CategoryStore;
