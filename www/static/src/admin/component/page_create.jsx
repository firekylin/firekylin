import moment from 'moment';

import PostCreate from './post_create';
import PageAction from 'admin/action/page';
import PageStore from 'admin/store/page';
import TipAction from 'common/action/tip';
import ThemeAction from 'admin/action/theme';
import ThemeStore from 'admin/store/theme';


module.exports = class extends PostCreate {
  type = 1;

  componentWillMount() {
    this.listenTo(PageStore, this.handleTrigger.bind(this));

    if(this.id) {
      PageAction.select(this.id);
    }

    this.state.postInfo.pathname = this.props.location.query.pathname;


    this.listenTo(ThemeStore, this.getThemeTemplateList.bind(this));
    ThemeAction.getPageTemplateList(window.SysConfig.options.theme || 'firekylin');
  }

  componentWillReceiveProps(nextProps) {
    this.id = nextProps.params.id | 0;
    if(this.id) {
      PageAction.select(this.id);
    }
    let initialState = this.initialState();
    this.setState(initialState);
  }

  handleTrigger(data, type) {
    switch(type) {
      case 'savePageFail':
        this.setState({draftSubmitting: false, postSubmitting: false});
        break;
      case 'savePageSuccess':
        if (!this.id && data.id) {
          this.id = data.id;
        }
        if (this.state.status === 3 && this.state.postInfo.is_public) {
          TipAction.success(`发布成功，
            <a href="/page/${this.state.postInfo.pathname}.html" target="_blank">
              点此查看页面
            </a>`, 5000);
        } else {
          TipAction.success('保存成功');
        }
        PageAction.select(this.id);
        this.setState({draftSubmitting: false, postSubmitting: false});
        break;
      case 'getPageInfo':
        if(data.create_time === '0000-00-00 00:00:00') {
          data.create_time = '';
        }
        data.create_time = data.create_time ?
          moment(new Date(data.create_time)).format('YYYY-MM-DD HH:mm:ss') :
          data.create_time;
        if(!data.options) {
          data.options = {push_sites: []};
        } else if(typeof(data.options) === 'string') {
          data.options = JSON.parse(data.options);
        } else {
          data.options.push_sites = data.options.push_sites || [];
        }
        this.setState({postInfo: data});
        break;
    }
  }

  handleValidSubmit(values) {
    if(!this.state.status) {
      this.setState({draftSubmitting: true});
    } else {
      this.setState({postSubmitting: true});
    }

    if(this.id) {
      values.id = this.id;
    }

    values.create_time = this.state.postInfo.create_time;
    values.status = this.state.status;
    values.type = this.type; //type: 0为文章，1为页面
    values.allow_comment = Number(this.state.postInfo.allow_comment);
    values.markdown_content = this.state.postInfo.markdown_content;
    values.options = JSON.stringify(this.state.postInfo.options);
    if(values.status === 3 && !values.markdown_content) {
      this.setState({draftSubmitting: false, postSubmitting: false});
      return TipAction.fail('没有内容不能提交呢！');
    }
    PageAction.save(values);
  }
}
