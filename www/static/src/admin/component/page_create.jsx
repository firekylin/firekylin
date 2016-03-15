import moment from 'moment';
import PostCreate from './post_create';

import PageAction from 'admin/action/page';
import PageStore from 'admin/store/page';
import TipAction from 'common/action/tip';

export default class extends PostCreate {
  type = 1;

  componentWillMount() {
    this.listenTo(PageStore, this.handleTrigger.bind(this));

    if(this.id){
      PageAction.select(this.id);
    }

    this.state.postInfo.pathname = this.props.location.query.pathname;
  }

  componentWillReceiveProps(nextProps) {
    this.id = nextProps.params.id | 0;
    if(this.id) {
      PageAction.select(this.id);
    }
    let initialState = this.initialState();
    this.setState(initialState);
  }

  handleTrigger(data, type){
    switch(type){
      case 'savePageFail':
        this.setState({draftSubmitting: false, postSubmitting: false});
        break;
      case 'savePageSuccess':
        TipAction.success(this.id ? '保存成功' : '添加成功');
        this.setState({draftSubmitting: false, postSubmitting: false});
        setTimeout(() => this.redirect('page/list'), 1000);
        break;
      case 'getPageInfo':
        data.create_time = moment( new Date(data.create_time) ).format('YYYY-MM-DD HH:mm:ss');
        this.setState({postInfo: data});
        break;
    }
  }

  handleValidSubmit(values){
    if( !this.state.status ) {
      this.setState({draftSubmitting: true});
    } else {
      this.setState({postSubmitting: true});
    }

    if(this.id){
      values.id = this.id;
    }

    values.status = this.state.status;
    values.type = this.type; //type: 0为文章，1为页面
    values.allow_comment = this.state.allow_comment;
    values.markdown_content = this.state.postInfo.markdown_content;
    PageAction.save(values);
  }
}
