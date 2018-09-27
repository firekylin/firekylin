import { observable, action } from 'mobx';
import { http } from '../../utils/http';
import { message } from 'antd';
import { String } from 'aws-sdk/clients/sns';
import { PageInfo } from './page.model';

class PageStore {
  @observable loading = false;
  @observable page = '1';
  @observable pagination = {};
  @observable pageInfo: PageInfo = {
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

  @action
  setPage = page => this.page = page

  @action
  setLoading = data => this.loading = data

  pageDeleteById(id: String) {
    return http.post<any>(`/admin/api/page/${id}?method=delete`);
  }
}

export default PageStore;
