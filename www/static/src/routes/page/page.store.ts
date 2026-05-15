import { makeAutoObservable } from 'mobx';
import { http } from '../../utils/http';
import { message } from 'antd';
import { PageInfo } from './page.model';

class PageStore {
  loading = false;
  page = '1';
  pagination = {};
  pageInfo: PageInfo = {
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

  constructor() {
    makeAutoObservable(this);
  }

  setPage = page => this.page = page

  setLoading = data => this.loading = data

  pageDeleteById(id: string) {
    return http.post<any>(`/admin/api/page/${id}?method=delete`);
  }
}

export default PageStore;
