import { observable, action } from 'mobx';
import { message } from 'antd';
import { http } from './utils/http';
import { Category } from './models/category.model';
import { Tag } from './models/tag.model';
import { Observable } from 'rxjs';
import { IResult } from './models/http.model';

interface SharedLoading {
  category?: boolean;
  tag?: boolean;
}

class SharedStore {
  getCategoryList$: Observable<IResult<Category[]>>;
  getDefaultCategory$: Observable<IResult<string>>;
  @observable defaultCategory = '';
  @observable categoryList: Category[] = [];
  @observable templateList: string[] = [];
  @observable tagList: Tag[] = [];
  @observable loading: SharedLoading = {
    category: true,
    tag: true,
  };

  @action
  setDefaultCategory = (data: string) => {
    this.defaultCategory = data;
  }

  @action
  setCategoryList = (data: Category[]) => {
    let list = data.filter(cat => cat.pid === 0);
    for (let i = 0, l = list.length; i < l; i++) {
        let child = data.filter(cat => cat.pid === list[i].id);
        if (child.length === 0) {
            continue;
        }
        list.splice.apply(list, ([i + 1, 0] as any).concat(child));
    }
    this.categoryList = list;
  }

  @action
  setTemplateList = data => this.templateList = data

  @action
  setTagList = (data: Tag[]) => this.tagList = data

  @action
  setLoading(loading: SharedLoading) {
    this.loading = Object.assign({}, this.loading, loading);
  }

  set$() {
    this.getCategoryList$ = http.get<Category[]>('/admin/api/cate');    
    this.getDefaultCategory$ = http.get('/admin/api/options?type=defaultCategory');
  }

  // 获取分类列表
  getCategoryList() {
    this.setLoading({category: true});
    this.getCategoryList$ = http.get<Category[]>('/admin/api/cate');    
    this.getCategoryList$.subscribe(
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
    this.getDefaultCategory$ = http.get('/admin/api/options?type=defaultCategory');
    this.getDefaultCategory$.subscribe(
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
  // 获取模版
  getTemplateList(theme: string) {
    http.get('/admin/api/theme?type=templateList', {theme})
    .subscribe(
      res => {
        if (res.errno === 0) {
          this.setTemplateList(res.data);
        }
      }
    );
  }

  // 更新系统
  updateSystem(step: number) {
    return http.post<any>('/admin/api/system?method=update&step=' + step);
  }
}

export default SharedStore;
