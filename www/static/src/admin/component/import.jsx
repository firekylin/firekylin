import React from 'react';
import Select, {Option} from 'rc-select';
import { Tabs, Tab } from 'react-bootstrap';
import { Radio, RadioGroup, Form, ValidatedInput, FileValidator } from 'react-bootstrap-validation';

import Base from 'base';
import firekylin from 'common/util/firekylin';

import BreadCrumb from 'admin/component/breadcrumb';
import OptionsAction from 'admin/action/options';
import OptionsStore from 'admin/store/options';
import UserAction from 'admin/action/user';
import CateAction from 'admin/action/cate';
import TipAction from 'common/action/tip';
import UserStore from 'admin/store/user';
import CateStore from 'admin/store/cate';

import 'rc-select/assets/index.css';

module.exports = class extends Base {
  state = this.initState();

  initState() {
    let options = window.SysConfig.options;
    if(!options.rssImportList) {
      options.rssImportList = [];
    } else if(typeof(options.rssImportList) === 'string') {
      options.rssImportList = JSON.parse(options.rssImportList);
    }
    return {
      users: [],
      cateList: [],
      key: 'normal',
      editingRow: -1,
      selectCate: null,
      selectUser: null,
      uploading: false,
      uploadType: 'wordpress',
      rssImportList: options.rssImportList
    };
  }

  componentWillMount() {
    this.listenTo(OptionsStore, this.handleTrigger.bind(this));
    this.listenTo(UserStore, this.getUserList.bind(this));
    this.listenTo(CateStore, this.getCateList.bind(this));

    CateAction.select();
    UserAction.select();
  }

  getCateList(cateList) {
    this.setState({cateList});
  }

  getUserList(users) {
    const selectUser = users[0].id;
    this.setState({users, selectUser});
  }

  handleTrigger(data, type) {
    switch (type) {
      case 'saveRSSImportListSuccess':
        TipAction.success('更新成功');
        break;
    }
  }

  handleValidSubmit(e) {
    this.setState({uploading: true});
    var form = new FormData();
    form.append('file', e.file[0]);
    form.append('importor', this.state.uploadType);
    firekylin.upload(form).then(result => {
      TipAction.success(result.data);
      alert(result.data);
      this.setState({uploading: false});
    }, () => {
      TipAction.fail('IMPORT_FAIL');
      this.setState({uploading: false});
    });
  }

  onValidRSSSubmit(e) {
    const {rssImportList, selectCate, selectUser, users} = this.state;
    rssImportList.push({
      url: e['rss-url'],
      user: selectUser,
      cate: selectCate
    });
    this.setState({
      rssImportList,
      selectCate: null,
      selectUser: users[0].id
    });
    this.updateRSS();
  }

  handleSelect(key) {
    this.setState({key});
  }

  updateRSS() {
    const {rssImportList} = this.state;
    window.SysConfig.options.rssImportList = rssImportList;
    OptionsAction.rssImportList(rssImportList);
    this.forceUpdate();
  }

  edit(idx, rss) {
    const {rssImportList} = this.state;
    rssImportList[idx] = rss;

    this.setState({rssImportList});
    this.updateRSS();
  }

  renderNormalImport() {
    let uploadType = this.state.uploadType;
    const radio = (
      <RadioGroup
          name='type'
          value={uploadType}
          validate={(value) => {
            uploadType = value;
            this.setState({ uploadType: uploadType });
            return true;
          }}
      >
        <Radio value='wordpress' label='WordPress' />
        <Radio value='ghost' label='Ghost / Jekyll' />
        <Radio value='hexo' label='Hexo' />
        <Radio value='markdown' label='Markdown文件' />
      </RadioGroup>
    );
    const uploadInput = {
      wordpress: (
        <div>
          <p>请上传 WordPress 中导出的 .xml 文件</p>
          <ValidatedInput
              type="file"
              name="file"
              label="上传文件："
              labelClassName="col-xs-2"
              wrapperClassName="col-xs-10"
              validate={files => {
                if (FileValidator.isEmpty(files)) {
                    return '请上传文件';
                }
                return true;
              }}
              accept="application/xml"
          />
        </div>
      ),
      ghost: (
        <div>
          <p>请上传 Ghost 中导出的 .json 文件，Jekyll用户请上传使用 <a href="https://github.com/redwallhp/Jekyll-to-Ghost">Jekyll to Ghost 插件</a>导出后的 .json 文件</p>
          <ValidatedInput
              type="file"
              name="file"
              label="上传文件："
              labelClassName="col-xs-2"
              wrapperClassName="col-xs-10"
              validate={files => {
                if (FileValidator.isEmpty(files)) {
                    return '请上传文件';
                }
                return true;
              }}
              accept="application/json"
          />
        </div>
      ),
      hexo: (
        <div>
          <p>请上传使用 <a href="https://github.com/lizheming/hexo-generator-hexo2firekylin">Hexo2Firekylin 插件</a> 导出后的 .json 文件</p>
          <ValidatedInput
              type="file"
              name="file"
              label="上传文件："
              labelClassName="col-xs-2"
              wrapperClassName="col-xs-10"
              validate={files => {
                if(FileValidator.isEmpty(files)) {
                  return '请上传文件';
                }
                return true;
              }}
              accept="application/json"
          />
        </div>
      ),
      markdown: (
        <div>
          <p>请将所有 Markdown 文件直接打包成 tar.gz 文件上传</p>
          <ValidatedInput
              type="file"
              name="file"
              label="上传文件："
              labelClassName="col-xs-2"
              wrapperClassName="col-xs-10"
              validate={files => {
                if(FileValidator.isEmpty(files)) {
                  return '请上传文件';
                }
                return true;
              }}
              accept="application/gzip"
          />
        </div>
      )
    };
    return (
      <div style={{paddingTop: 8}}>
        <Form onValidSubmit={this.handleValidSubmit.bind(this)} className="clearfix options-import">
          <div className="form-group">
            <label>请选择导入的博客平台</label>
            { radio }
          </div>
          {uploadInput[this.state.uploadType]}
          <button type="submit" className="btn btn-primary">
            上传{this.state.uploading?'中...':''}
          </button>
        </Form>
      </div>
    );
  }

  normalRow(rss, i) {
    const {users, cateList} = this.state;
    const user = users.find(user => user.id === rss.user);
    const cate = cateList.find(cate => cate.id === rss.cate);
    return (
      <tr
        key={i}
        className="fk-dragable-row"
      >
        <td>{rss.url}</td>
        <td>{user ? (user.display_name||user.name) : '/'}</td>
        <td>{cate ? cate.name : '/'}</td>
        <td>
          <button
              type="button"
              className="btn btn-primary btn-xs"
              onClick={()=> {
                this.setState({editingRow: i, editingRSS: Object.assign({}, rss)});
              }}
          >
            <span className="glyphicon glyphicon-edit"></span>
            <span>编辑</span>
          </button>
          <span> </span>
          <button
              type="button"
              disabled={this.state.editingRow !== -1}
              className="btn btn-danger btn-xs"
              onClick={()=> {
                this.state.rssImportList.splice(i, 1);
                this.updateRSS();
              }}
          >
            <span className="glyphicon glyphicon-trash"></span>
            <span>删除</span>
          </button>
        </td>
      </tr>
    )
  }

  editingRow(nav, i) {
    const {users, cateList, editingRSS} = this.state;
    return (
      <tr
        key={`editing-${i}`}
        className="fk-dragable-row"
      >
        <td>
          <ValidatedInput
              type="text"
              name="rss-url"
              validate="required"
              defaultValue={editingRSS.url}
              onChange={e => {
                editingRSS.url = e.target.value;
                this.setState({editingRSS});
              }}
          />
        </td>
        <td>
          <Select
            value={editingRSS.user}
            style={{width: '100%'}}
            optionLabelProp="children"
            onChange={val => {
              editingRSS.user = val;
              this.setState({editingRSS})
            }}
          >
              {users.map(user =>
                <Option
                    key={user.id}
                    value={user.id}
                >
                  {user.display_name||user.name}
                </Option>
              )}
          </Select>
        </td>
        <td>
          <Select
            value={editingRSS.cate}
            style={{width: '100%'}}
            optionLabelProp="children"
            onChange={val => {
              editingRSS.cate = val;
              this.setState({editingRSS});
            }}
          >
              {cateList.map(cate =>
                <Option
                    key={cate.id}
                    value={cate.id}
                >
                  {cate.name}
                </Option>
              )}
          </Select>
        </td>
        <td>
          <button
              type="button"
              className="btn btn-primary btn-xs"
              onClick={()=> {
                if (editingRSS.url && editingRSS.user && editingRSS.cate) {
                  this.edit(this.state.editingRow, this.state.editingRSS);
                  this.setState({editingRow: -1, editingRSS: null});
                }
              }}
          >
            <span className="glyphicon glyphicon-edit"></span>
            <span>保存</span>
          </button>
          <span> </span>
          <button
              type="button"
              className="btn btn-default btn-xs"
              onClick={()=> {
                this.setState({editingRow: -1, editingRSS: null});
              }}
          >
            <span className="glyphicon glyphicon-remove"></span>
            <span>取消</span>
          </button>
        </td>
      </tr>
    )
  }

  renderRSSImport() {
    const {rssImportList, users, selectUser, cateList, selectCate} = this.state;

    const rows = rssImportList.map((nav, i) =>
      this.state.editingRow !== i ? this.normalRow(nav, i) : this.editingRow(nav, i)
    );

    rows.push(
      <tr key="form">
        <td>
          <ValidatedInput
              type="text"
              name="rss-url"
              validate="required"
          />
        </td>
        <td>
          <Select
            value={selectUser}
            style={{width: '100%'}}
            optionLabelProp="children"
            onChange={val => this.setState({selectUser: val})}
          >
              {users.map(user =>
                <Option
                    key={user.id}
                    value={user.id}
                >
                  {user.display_name||user.name}
                </Option>
              )}
          </Select>
        </td>
        <td>
          <Select
            value={selectCate}
            style={{width: '100%'}}
            optionLabelProp="children"
            onChange={val => this.setState({selectCate: val})}
          >
              {cateList.map(cate =>
                <Option
                    key={cate.id}
                    value={cate.id}
                >
                  {cate.name}
                </Option>
              )}
          </Select>
        </td>
        <td>
          <button type="submit" className="btn btn-primary btn-xs">
            <span className="glyphicon glyphicon-edit"></span>
            <span>新增</span>
          </button>
        </td>
      </tr>
    );
    return (
      <Form onValidSubmit={this.onValidRSSSubmit.bind(this)}>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>RSS地址</th>
              <th>导入至用户</th>
              <th>导入至分类</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody children={rows} />
        </table>
        <p>
          <span className="pull-lef">
          注：后台会每隔1小时自动抓取 RSS 列表新增内容导入到对应的用户和分类下。
          </span>
        </p>
      </Form>
    );
  }

  render() {
    const {key} = this.state;
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <Tabs activeKey={this.state.key} onSelect={this.handleSelect.bind(this)}>
            <Tab eventKey="normal" title="普通导入"></Tab>
            <Tab eventKey="rss" title="RSS导入"></Tab>
          </Tabs>
          {key === 'normal' ? this.renderNormalImport() : null}
          {key === 'rss' ? this.renderRSSImport() : null}
        </div>
      </div>
    );
  }
}
