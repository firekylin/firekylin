import React from 'react';
import ReactDom from 'react-dom';
import Base from 'base';
import {Link} from 'react-router';
import classnames from 'classnames';
import Datetime from 'react-datetime';
import 'react-datetime/css/react-datetime.css';
import moment from 'moment';
import {Form, ValidatedInput, Radio, RadioGroup} from 'react-bootstrap-validation';
import Editor from 'common/component/editor';
import Select, {Option} from 'rc-select';
import 'rc-select/assets/index.css';

import BreadCrumb from 'admin/component/breadcrumb';
import PostAction from 'admin/action/post';
import PostStore from 'admin/store/post';
import CateAction from 'admin/action/cate';
import CateStore from 'admin/store/cate';
import TagAction from 'admin/action/tag';
import TagStore from 'admin/store/tag';
import TipAction from 'common/action/tip';
import firekylin from 'common/util/firekylin';
import ModalAction from 'common/action/modal';
import './style.css';

export default class extends Base {
  initialState() {
    return Object.assign({
      postSubmitting: false,
      draftSubmitting: false,
      postInfo: {
        title: '',
        pathname: '',
        markdown_content: '',
        tag: [],
        cate: [],
        is_public: '1',
        create_time: '',
        allow_comment: true
      },
      status: 3,
      cateList: [],
      tagList: []
    });
  }
  constructor(props){
    super(props);
    this.state = this.initialState();

    this.type = 0;
    this.cate = {};
    this.id = this.props.params.id | 0;
  }

  componentWillMount() {
    this.listenTo(PostStore, this.handleTrigger.bind(this));
    this.listenTo(CateStore, cateList => {
      let list = cateList.filter(cate => cate.pid === 0);
      for(let i=0,l=list.length; i<l; i++) {
        let child = cateList.filter(cate => cate.pid === list[i].id);
        if( child.length === 0 ) continue;
        list.splice.apply(list, [i+1,0].concat(child));
      }
      this.setState({cateList: list});
    });
    this.listenTo(TagStore, tagList => this.setState({tagList}));

    CateAction.select();
    TagAction.select();
    if(this.id){
      PostAction.select(this.id);
    }
  }
  componentWillReceiveProps(nextProps) {
    this.id = nextProps.params.id | 0;
    if(this.id) {
      PostAction.select(this.id);
    }
    let initialState = this.initialState();
    initialState.cateList = this.state.cateList;
    initialState.tagList = this.state.tagList;
    this.setState(initialState);
  }
  /**
   * hanle trigger
   * @param  {[type]} data [description]
   * @param  {[type]} type [description]
   * @return {[type]}      [description]
   */
  handleTrigger(data, type){
    switch(type){
      case 'savePostFail':
        this.setState({draftSubmitting: false, postSubmitting: false});
        break;
      case 'savePostSuccess':
        TipAction.success(this.id ? '保存成功' : '添加成功');
        this.setState({draftSubmitting: false, postSubmitting: false});
        setTimeout(() => this.redirect('post/list'), 1000);
        break;
      case 'getPostInfo':
        data.create_time = moment( new Date(data.create_time) ).format('YYYY-MM-DD HH:mm:ss');
        data.tag = data.tag.map(tag => tag.name);
        data.cate.forEach(item => this.cate[item.id] = true);
        this.setState({postInfo: data});
        break;
    }
  }
  /**
   * save
   * @return {}       []
   */
  handleValidSubmit(values){
    if( !this.state.status ) {
      this.setState({draftSubmitting: true});
    } else {
      this.setState({postSubmitting: true});
    }

    if(this.id){
      values.id = this.id;
    }

    /** 草稿不存创建时间，其它的状态则默认时间为当前时间 **/
    if( this.state.status === 0 ) {
      values.create_time = '';
    } else {
      values.create_time = this.state.postInfo.create_time || moment().format('YYYY-MM-DD HH:mm:ss');
    }

    values.status = this.state.status;
    values.markdown_content = this.state.postInfo.markdown_content;
    if( values.status === 3 && !values.markdown_content ) {
      this.setState({draftSubmitting: false, postSubmitting: false});
      return TipAction.fail('没有内容不能提交呢！');
    }

    values.type = this.type; //type: 0为文章，1为页面
    values.allow_comment = this.state.postInfo.allow_comment;
    values.cate = Object.keys(this.cate).filter(item => this.cate[item]);
    values.tag = this.state.postInfo.tag;
    PostAction.save(values);
  }
  /**
   * render
   * @return {} []
   */
  render(){
    let props = {}
    if(this.state.draftSubmitting || this.state.postSubmitting){
      props.disabled = true;
    }

    //如果是在编辑状态下在没有拿到数据之前不做渲染
    //针对 react-bootstrap-validation 插件在 render 之后不更新 defaultValue 做的处理
    if( this.id && !this.state.postInfo.content ) {
      return null;
    }

    let cateInitial = [];
    if( Array.isArray(this.state.postInfo.cate) ) {
      cateInitial = this.state.postInfo.cate.map( item => item.id );
    }

    //针对 RadioGroup 只有在值为字符串才正常的情况做处理
    if( firekylin.isNumber(this.state.postInfo.is_public) ) {
      this.state.postInfo.is_public += '';
    }

    //baseUrl
    let baseUrl = location.origin + '/' + ['post', 'page'][this.type] + '/';
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <Form
            model={this.state.postInfo}
            className="post-create clearfix"
            onValidSubmit={this.handleValidSubmit.bind(this)}
          >
            <div className="row">
              <div className={classnames({'col-xs-9': !this.state.isFullScreen})}>
                <ValidatedInput
                    name="title"
                    type="text"
                    placeholder="标题"
                    validate="required"
                    label={`${this.id ? '编辑' : '撰写'}${this.type ? '页面' : '文章'}`}
                    value={this.state.postInfo.title}
                    onChange={e => {
                      this.state.postInfo.title = e.target.value;
                      this.forceUpdate();
                    }}
                />
                <div className={classnames('pathname')}>
                  <span>{baseUrl}</span>
                  <ValidatedInput
                      name="pathname"
                      type="text"
                      validate="required"
                      disabled={this.state.postInfo.status === 3}
                      value={this.state.postInfo.pathname}
                      onChange={e => {
                        this.state.postInfo.pathname = e.target.value;
                        this.forceUpdate();
                      }}
                  />
                  <span>.html</span>
                </div>
                <div className="form-group">
                  <Editor
                    content={this.state.postInfo.markdown_content}
                    onChange={content => {
                      this.state.postInfo.markdown_content = content;
                      this.forceUpdate();
                    }}
                    onFullScreen={isFullScreen => this.setState({isFullScreen})}
                    info = {{id: this.id,type: this.type}}
                  />
                  <p style={{lineHeight: '30px'}}>文章使用 markdown 格式，格式说明请见<a href="https://guides.github.com/features/mastering-markdown/">这里</a></p>
                </div>
              </div>
              <div className={classnames('col-xs-3')}>
                <div className="button-group">
                  <button
                    type="submit"
                    {...props}
                    className="btn btn-default"
                    onClick={()=> {this.state.status = 0;localStorage.removeItem('unsavetype'+this.type+'id'+this.id)}}
                  >{this.state.draftSubmitting ? '保存中...' : '保存草稿'}</button>
                  <span> </span>
                  <button
                      type="submit"
                      {...props}
                      className="btn btn-primary"
                      onClick={()=>{this.state.status = 3;localStorage.removeItem('unsavetype'+this.type+'id'+this.id)}}
                  >{this.state.postSubmitting ? '发布中...' : `发布${this.type ? '页面' : '文章'}`}</button>
                </div>
                <div style={{marginBottom: 15}}>
                  <label>发布日期</label>
                  <div>
                    <Datetime
                      dateFormat="YYYY-MM-DD"
                      timeFormat="HH:mm:ss"
                      locale="zh-cn"
                      value={this.state.postInfo.create_time}
                      onChange={val => {
                        this.state.postInfo.create_time = val;
                        this.forceUpdate();
                      }}
                    />
                  </div>
                </div>
                {!this.type ?
                <div className="form-group">
                  <label className="control-label">分类</label>
                  <ul>
                    {this.state.cateList.map(cate =>
                      <li key={cate.id}>
                        {cate.pid !== 0 ? '　' : null}
                        <label>
                          <input
                              type="checkbox"
                              name="cate"
                              value={cate.id}
                              checked={cateInitial.includes(cate.id)}
                              onChange={()=>{
                                this.cate[cate.id] = !this.cate[cate.id];
                                this.state.postInfo.cate = this.state.cateList.filter(cate => this.cate[cate.id]);
                                this.forceUpdate();
                              }}
                          />
                          <span style={{fontWeight: 'normal'}}>{cate.name}</span>
                        </label>
                      </li>
                    )}
                  </ul>
                </div>
                : null}
                {!this.type ?
                <div className="form-group">
                  <label className="control-label">标签</label>
                  <div>
                    <Select
                        tags
                        style={{width: '100%'}}
                        maxTagTextLength={5}
                        value={this.state.postInfo.tag}
                        onChange={val => { this.state.postInfo.tag = val; this.forceUpdate(); }}
                    >
                        {this.state.tagList.map( tag =>
                          <Option key={tag.name} value={tag.name}>{tag.name}</Option>
                        )}
                    </Select>
                  </div>
                </div>
                : null}
                <RadioGroup
                  name="is_public"
                  label="公开度"
                  wrapperClassName="col-xs-12 is-public-radiogroup"
                >
                  <Radio value="1" label="公开" />
                  <Radio value="0" label="不公开" />
                </RadioGroup>
                <div className="form-group">
                  <label className="control-label">权限控制</label>
                  <div>
                    <label>
                      <input
                          type="checkbox"
                          name="allow_comment"
                          checked={this.state.postInfo.allow_comment}
                          onChange={()=> {
                            this.state.postInfo.allow_comment = !this.state.postInfo.allow_comment;
                            this.forceUpdate();
                          }}
                      />
                      允许评论
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </Form>
        </div>
      </div>
    );
  }
}
