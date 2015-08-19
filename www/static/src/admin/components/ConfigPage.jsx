import React from "react";
import autobind from "autobind-decorator";

import BaseComponent from "./BaseComponent";
import SystemActions from "../actions/SystemActions";
import AlertActions from '../actions/AlertActions';
import { SystemStore, SystemStatusStore } from "../stores/SystemStores";
import FormHelper from '../utils/FormHelper';


@autobind
class DashBoardPage extends BaseComponent {

  componentDidMount() {
    SystemActions.load();

    this.subscribe(
        SystemStore.listen(this.onChange),
        SystemStatusStore.listen(this.onStatusChange)
    );
  }

  render() {

    let config = [
      {
        id: 'site',
        name: '站点设置',
        global: true,
        fields: [
          { id: 'url', name: '站点URL', type: 'text' },
          { id: 'title', name: '站点标题', hint: '展示在博客侧边栏', type: 'text' },
          { id: 'subtitle', name: '站点副标题', hint: '展示在博客侧边栏', type: 'text' },
          { id: 'author', name: '博主姓名', hint: '您的姓名或昵称', type: 'text' }
        ]
      },
      {
        id: 'seo',
        name: 'SEO设置',
        fields: [
          { id: 'title', name: 'TITLE', hint: '显示在标题栏中的标题', type: 'text' },
          { id: 'description', name: 'DESCRIPTION', hint: '一句话描述您的网站', type: 'text' },
          { id: 'keywords', name: 'KEYWORDS', hint: '关于您网站的关键词，用英文,分割', type: 'text' }
        ]
      },
      {
        id: 'post',
        name: '博文设置',
        fields: [
          { id: 'showurl', name: '显示URL', hint: '是否在文章底部显示文章的URL(便于转载)', type: 'checkbox' }
        ]
      },
      {
        id: 'share',
        name: '分享设置',
        fields: [
          { id: 'on', name: '站外分享', hint: '是否开启站外分享', type: 'checkbox' },
          { id: 'to', name: '分享到', hint: '要分享到哪些网站', type: 'checkbox', options: {'微信' : 'weixin', '微博': 'weibo', 'Facebook': 'facebook', 'Twitter': 'twitter'} },
          { id: 'other', name: '显示更多分享', type: 'checkbox' },
          { id: 'number', name: '显示分享数量', type: 'checkbox' },
          { id: 'size', name: '分享图标大小', type: 'radio', options: {'大' : 'jiathis_style_32x32', '中': 'jiathis_style_24x24', '小': 'jiathis_style'} },
          { id: 'diy', name: '自定义分享代码', hint: '当填入自定义分享代码时，其他分享设置将失效', type: 'textarea' }
        ]
      },
      {
        id: 'discuss',
        name: '评论设置',
        fields: [
          { id: 'on', name: '启用评论', hint: '是否开启文章评论', type: 'checkbox' },
          { id: 'commoncode', name: '评论公共代码', type: 'textarea' },
          { id: 'pagecode', name: '每页评论代码', type: 'textarea' },
          { id: 'numbercode', name: '评论数量代码', type: 'textarea' },
          { id: 'hint', name: '配置说明', type: 'hint', value: '本模块配置需要一定的代码基础,可以使用disqus或多说等评论插件\n\n可以使用的替换字符串有：\n文章ID:\t$$id$$\n文章URL:\t$$url$$\n文章标题:\t$$title$$\n文章分类:\t$$category$$'}
        ]
      },
      {
        id: 'sns',
        name: '社交网络',
        hint: '所有以下部分填写的项目将在侧边栏中展示图标',
        fields: [
          { id: 'email', name: 'Email', type: 'text' },
          { id: 'facebook', name: 'Facebook 用户名', type: 'text' },
          { id: 'googleplus', name: 'Google Plus 账号', type: 'text' },
          { id: 'twitter', name: 'Twitter 账号', type: 'text' },
          { id: 'github', name: 'Github 账号', type: 'text' },
          { id: 'stackoverflow', name: 'Stack Overflow ID', type: 'text' },
          { id: 'douban', name: '豆瓣网账号', type: 'text' },
          { id: 'weibo', name: '微博账号', type: 'text' }
        ]
      },
      {
        id: 'rss',
        name: '订阅设置',
        fields: [
          { id: 'on', name: '开启订阅功能', type: 'checkbox' },
          { id: 'number', name: 'feed中显示数量', type: 'number' },
          { id: 'excerpt', name: '文章类型', type: 'radio', options: { '摘要': true, '全文': false } },
        ]
      }
    ];

    let formHelper = new FormHelper(this);

    return (
      <div className="ConfigPage page">
        <div className="title">
          <h2>系统设置</h2>
        </div>
        <form className="form" onSubmit={ this.handleSave }>
        { formHelper.buildBlocks(config) }
        <div className="button-wrapper">
          <button type="submit" className="button green">全部保存</button>
        </div>
        </form>
      </div>
    )
  }

  onChange(data) {
    this.setState(data.config);
  }

  onStatusChange(status) {

    if (status.action == 'load' && status.error) {
      AlertActions.error('配置读取失败：' + status.error);
    }

    if (status.action == 'update' && !status.loading) {
      if (status.error) {
        AlertActions.error('保存失败：' + status.error);
      } else {
        AlertActions.success('保存成功');
      }
    }
  }

  handleSave(event) {
    event.preventDefault();

    SystemActions.update(this.state);
  }
}

export default DashBoardPage;