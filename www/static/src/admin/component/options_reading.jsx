import React from 'react';
import { Form, ValidatedInput, Radio, RadioGroup } from 'react-bootstrap-validation';

import OptionsAction from '../action/options';
import OptionsStore from '../store/options';
import Base from 'base';
import BreadCrumb from 'admin/component/breadcrumb';
import PageAction from 'admin/action/page';
import PageStore from 'admin/store/page';
import TipAction from 'common/action/tip';

module.exports = class extends Base {
  constructor(props) {
    super(props);
    this.state = {
      submitting: false,
      options: window.SysConfig.options,
      pageList: []
    };

    let {frontPage} = this.state.options;
    if(!frontPage) {
      frontPage = 'recent';
    } else {
      this.state.options.frontPagePage = frontPage;
      frontPage = 'page';
    }
    this.state.options.frontPage = frontPage;
  }

  componentDidMount() {
    this.listenTo(OptionsStore, this.handleTrigger.bind(this));
    this.listenTo(PageStore, this.getPageList.bind(this));
    PageAction.selectList(-1);
  }

  handleTrigger(data, type) {
    switch(type) {
      case 'saveOptionsSuccess':
        this.setState({submitting: false});
        TipAction.success('更新成功');
        for(let key in this.optionsSavedValue) {
          window.SysConfig.options[key] = this.optionsSavedValue[key];
        }
        break;
    }
  }

  getPageList(pageList) {
    this.setState({pageList});
  }

  handleValidSubmit(values) {
    if(values.frontPage === 'recent') {
      values.frontPage = '';
    } else if(values.frontPage === 'page') {
      values.frontPage = this.state.options.frontPagePage;
    }

    this.setState({submitting: true});
    this.optionsSavedValue = values;
    OptionsAction.save(values);
  }

  handleInvalidSubmit() {

  }

  renderPageList() {
    return (
      <select
          name="frontPagePage"
          ref="frontPagePage"
          value={this.state.options.frontPagePage}
          onChange={e => {
            let options = this.state.options;
            options.frontPagePage = e.target.value;
            this.setState({options});
          }}
      >
        {this.state.pageList.map(page => (<option key={page.id} value={page.pathname}>{page.title}</option>))}
      </select>
    );
  }

  render() {
    let BtnProps = {}
    if(this.state.submitting) {
      BtnProps.disabled = true;
    }
    let postListUrl = location.origin + '/post/list';

    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <h3 style={{marginBottom: '20px'}}>阅读设置</h3>
          <Form
          model={this.state.options}
          className="clearfix options-reading"
          onValidSubmit={this.handleValidSubmit.bind(this)}
          onInvalidSubmit={this.handleInvalidSubmit.bind(this)}
          >
            <RadioGroup
                defaultValue="recent"
                name="frontPage"
                label="自定义站点首页"
                help={<span>设置页面为首页之后仍可以通过 <a href={postListUrl}>{postListUrl}</a> 访问最新发布的文章</span>}
            >
              <Radio value="recent" label="显示最新发布的文章" />
              <Radio value="page" label={<div>
                <span>使用 </span>
                {this.renderPageList()}
                <span> 页面作为首页</span>
              </div>} />
            </RadioGroup>
            <RadioGroup
                defaultValue="0"
                name="postTocManual"
                label="自动生成文章TOC目录"
                help={<span>自动生成会为文章生成TOC目录，选择非自动后你也可以在文章开头插入 <code>&lt;!--toc--&gt;</code> 来为这篇文章生成目录</span>}
            >
              <Radio value="0" label="是" />
              <Radio value="1" label="否" />
            </RadioGroup>
            <RadioGroup
                defaultValue="1"
                name="auditFreshCreateTime"
                label="文章审核通过时更新文章的发布时间"
                help={<span>文章审核通过时，若文章的发布时间在当前时间之前，更新文章的发布时间</span>}
            >
              <Radio value="1" label="是" />
              <Radio value="0" label="否" />
            </RadioGroup>
            <div className="form-group">
              <label>每页文章数目</label>
              <ValidatedInput
                type="text"
                name="postsListSize"
                defaultValue={10}
                className="form-control"
                help="此数目用于指定文章归档输出时每页显示的文章数目."
                validate={val => {
                  if(!val) {
                    return '请填写列表页文章数目';
                  }

                  let p = Number(val);
                  if(Number.isNaN(p)) {
                    return '请填入一个数字';
                  }

                  if(parseInt(val) !== p) {
                    return '请填入一个整数';
                  }

                  return true;
                }}
              />
            </div>

            <div className="form-group">
              <label>自动生成摘要截取的字符数</label>
              <ValidatedInput
                type="text"
                name="auto_summary"
                defaultValue={0}
                className="form-control"
                help="文章列表页自动截取开头的部分文字作为摘要。0 为禁用，大于 0 为截取的字符数"
                validate={val => {
                  if(!val) {
                    return '请填写自动截取的字符数';
                  }

                  let p = parseInt(val);
                  if(Number.isNaN(p)) {
                    return '请填入一个数字';
                  }

                  return true;
                }}
              />
            </div>

            <RadioGroup
                defaultValue="1"
                name="feedFullText"
                label="RSS 聚合全文输出"
                help="如果你不希望在聚合中输出文章全文,请使用仅输出摘要选项.摘要的文字取决于你在文章中使用分隔符的位置."
            >
              <Radio value="1" label="全文输出" />
              <Radio value="0" label="摘要输出" />
            </RadioGroup>

            <button type="submit" {...BtnProps} className="btn btn-primary">
              {this.state.submitting ? '提交中...' : '提交'}
            </button>
          </Form>
        </div>
      </div>
    );
  }
}
