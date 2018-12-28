import { observable, action } from 'mobx';
import { ArticleInfo } from './article.model';
import { http } from '../../utils/http';
import moment from 'moment';
import { ArticleTypeEnum } from '../../enums/article-type.enum';
import { ArticleEnum } from './article.enum';

class ArticleStore {
  @observable articleInfo: ArticleInfo = {
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
    status: ArticleEnum.SAVE,
    user_id: '',
  };

  @action
  setArticleInfo = info => {
    if (info.options) {
      info.options = Object.assign({}, this.articleInfo.options, info.options);
    }
    this.articleInfo = Object.assign({}, this.articleInfo, info);
  }

  // 重置
  resetArticleInfo() {
    this.setArticleInfo({
      title: '',
      pathname: '',
      markdown_content: '',
      tag: [],
      cate: [],
      is_public: '1',
      create_time: new Date().toUTCString(),
      allow_comment: true,
      options: JSON.stringify({
        template: '',
        featuredImage: '',
        push_sites: []
      }),
      status: ArticleEnum.DRAFT,
      user_id: '',
    });
  }

  getArticleInfoById(id: number, type: ArticleTypeEnum) {
    let url = '/admin/api/post/';
    if (type) {
      url = '/admin/api/page/';
    }
    http.get<any>(`${url}${id}`)
      .subscribe(
        res => {
            if (res.errno === 0) {
                if (res.data.create_time === '0000-00-00 00:00:00') {
                    res.data.create_time = '';
                }
                const re = /-/g;
                res.data.create_time = res.data.create_time.replace(re, '/');
                res.data.create_time = res.data.create_time 
                    ? moment(new Date(res.data.create_time)) 
                    : new Date();
                if (type === ArticleTypeEnum.POST) {
                  res.data.tag = res.data.tag.map(tag => tag.name);
                  res.data.cate.forEach(cat => cat.id);
                }
                res.data.is_public = res.data.is_public.toString();
                if (!res.data.options) {
                    res.data.options = { push_sites: [] };
                } else if (typeof (res.data.options) === 'string') {
                    res.data.options = JSON.parse(res.data.options);
                } else {
                    res.data.options.push_sites = res.data.options.push_sites || [];
                }
                this.setArticleInfo({ ...res.data });
            }
        }
    );
  }

  // 发布文章 / 草稿
  articleSubmit(params: any, type: ArticleTypeEnum) {
    let url = '/admin/api/post';
    if (type) {
      url = '/admin/api/page';
    }
    if (params.id) {
        url += '/' + params.id + '?method=put';
    }
    return http.post<any>(url, params);
  }

}

export default ArticleStore;
