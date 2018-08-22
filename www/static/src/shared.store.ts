import { observable, action } from 'mobx';
import { message } from 'antd';
import { http } from './utils/http';
import { Category } from './models/category.model';

interface SharedLoading {
  category?: boolean;
}

class SharedStore {
  @observable categoryList: Category[] = [];
  @observable loading: SharedLoading = {
    category: true,
  };
  
  @action
  setCategoryList = data => this.categoryList = data

  @action
  setLoading(loading: SharedLoading) {
    this.loading = Object.assign(this.loading, loading);
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

  // 更新系统
  updateSystem(step: number) {
    return http.post<any>('/admin/api/system?method=update&step=' + step);
  }
}

export default SharedStore;
