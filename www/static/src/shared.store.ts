import { makeAutoObservable } from 'mobx';
import { message } from 'antd';
import { http } from './utils/http';
import { Category } from './models/category.model';
import { Tag } from './models/tag.model';
import { Observable } from 'rxjs';
import { IResult } from './models/http.model';
import { map } from 'rxjs/operators';
import { tools } from './utils/tools';

interface SharedLoading {
  category?: boolean;
  tag?: boolean;
  page?: boolean;
}

export interface ThemeField {
  name: string;
  type: 'text' | 'url' | 'email' | 'password' | 'textarea' | 'select' | 'radio' | 'checkbox';
  label?: string;
  help?: string;
  default?: any;
  options?: any[];
}

class SharedStore {
  getCategoryList$: Observable<IResult<Category[]>>;
  getDefaultCategory$: Observable<IResult<string>>;
  defaultCategory = '';
  categoryList: Category[] = [];
  userList: any = [];
  templateList: string[] = [];
  themeFields: ThemeField[] = [];
  themeFieldsTheme = '';
  pageList = [];
  tagList: Tag[] = [];
  loading: SharedLoading = {
    category: false,
    tag: false,
    page: false,
  };

  constructor() {
    makeAutoObservable(this);
  }

  setDefaultCategory = (data: string) => {
    this.defaultCategory = data;
  }

  setUserList = data => this.userList = data

  setCategoryList = (data: Category[]) => {
    let list = data.filter(cat => cat.pid === 0);
    for (let i = 0; i < list.length; i++) {
        let child = data.filter(cat => cat.pid === list[i].id);
        if (child.length === 0) {
            continue;
        }
        list.splice.apply(list, ([i + 1, 0] as any).concat(child));
        i += child.length;
    }
    this.categoryList = list;
  }

  setTemplateList = data => this.templateList = data

  setThemeFields = (data: ThemeField[]) => this.themeFields = data

  setTagList = (data: Tag[]) => this.tagList = data

  setPageList = data => this.pageList = data

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

  getUserList(type?: string) {
    return http.get<any>(`/admin/api/user`, {type});
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

  // 获取主题声明的通用文章字段
  getThemeFields(theme: string) {
    this.themeFieldsTheme = theme;
    this.setThemeFields([]);
    http.get<ThemeField[]>('/admin/api/theme?type=themeFields', {theme})
    .subscribe(res => {
      if (this.themeFieldsTheme === theme && res.errno === 0) {
        this.setThemeFields(Array.isArray(res.data) ? res.data : []);
      }
    }, () => {
      if (this.themeFieldsTheme === theme) this.setThemeFields([]);
    });
  }

  // 获取页面
  getPageList(page: string): void {
    this.setLoading({page: true});
    http.get<any[]>('/admin/api/page', {page})
      .pipe(
        map(res => {
          res.data.map((item, key) => {
            item.key = item.id;
            item.author = item.user.name;
            item.statusText = tools.getStatusText(item.status, item.create_time);
          });
          return res;
        })
    )
    .subscribe(
      res => {
        if (res.errno === 0) {
          this.setPageList(res.data);
          this.setLoading({page: false});
        } else {
          message.error(res.errmsg);
          this.setLoading({page: false});
        }
      },
      err => {
        message.error(err);
        this.setLoading({page: false});
      }
    );
  }

  // 更新系统
  updateSystem(_step: number) {
    return http.post<any>('/admin/api/system?method=update', {}, {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}});
  }
}

export default SharedStore;
