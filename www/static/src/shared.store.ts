import { observable, action } from 'mobx';
import { message } from 'antd';
import { http } from './utils/http';
import { Category } from './models/category.model';
import { Tag } from './models/tag.model';

interface SharedLoading {
  category?: boolean;
  tag?: boolean;
}

class SharedStore {
  @observable defaultCategory = '';
  @observable categoryList: Category[] = [];
  @observable tagList: Tag[];
  @observable loading: SharedLoading = {
    category: true,
    tag: true,
  };

  @action
  setDefaultCategory = (data: string) => this.defaultCategory = data

  @action
  setCategoryList = (data: Category[]) => this.categoryList = data

  @action
  setTagList = (data: Tag[]) => this.tagList = data

  @action
  setLoading(loading: SharedLoading) {
    this.loading = Object.assign({}, this.loading, loading);
  }

  // 获取分类列表
  getCategoryList() {
    this.setLoading({category: true});
    http.get<Category[]>('/admin/api/cate')
      .subscribe(
        res => {
          if (res.errno === 0) {
              this.setLoading({category: false});
              this.setCategoryList(res.data);
          }
        },
        err => {
          this.setLoading({category: false});
          message.error(err);
        }
      );
  }

  // 获取默认分类
  getDefaultCategory() {
    http.get<string>('/admin/api/options?type=defaultCategory')
    .subscribe(
      res => {
        if (res.errno === 0) {
          this.setDefaultCategory(res.data);
        }
      }
    );
  }

  // 获取标签列表
  getTagList() {
    this.setLoading({tag: true});
    http.get<Tag[]>('/admin/api/tag')
      .subscribe(
        res => {
          if (res.errno === 0) {
              this.setLoading({tag: false});
              this.setTagList(res.data);
          }
        },
        err => {
          this.setLoading({tag: false});
          message.error(err);
        }
      );
  }

  // 更新系统
  updateSystem(step: number) {
    return http.post<any>('/admin/api/system?method=update&step=' + step);
  }
}

export default SharedStore;
