import { Input, Divider, Button, message, Select } from 'antd';
import React from 'react';
import { inject, observer } from 'mobx-react';
import 'antd/lib/table/style/index';
import classNames from 'classnames';

const Option = Select.Option;
@inject('sharedStore', 'optionsImportStore')
@observer
class OptionsImportRss extends React.Component<any, any> {
    state = this.initState();

    constructor(props: any) {
        super(props);
    }
    initState() {
        let options = window.SysConfig.options;
        if (!options.rssImportList) {
            options.rssImportList = [];
        } else if (typeof(options.rssImportList) === 'string') {
            options.rssImportList = JSON.parse(options.rssImportList);
        }
        return {
            key: 'normal',
            editingRow: -1,
            selectCate: '',
            selectUser: '',
            uploading: false,
            uploadType: 'wordpress',
            rssImportList: options.rssImportList,
            editingRSS: {
                url: '',
                user: '',
                cate: '',
            },
            hasError: {
                new: false
            },
            rssUrl: '',
        };
    }
    componentDidMount() {
        this.props.sharedStore.getCategoryList();
        this.getUserList();
    }

    getUserList() {
        this.props.sharedStore.getUserList()
        .toPromise()
        .then(res => {
            if (res.errno === 0 && res.data.length > 0) {
                this.props.sharedStore.setUserList(res.data);
                this.setState({selectUser: res.data[0].id});
            }
        })
        .catch(err => {
            message.error('加载用户列表失败，请稍后重试');
        });
    }

    normalRow(rss:  any, i: number) {
        const {userList, categoryList} = this.props.sharedStore;
        const user = userList.find((item: any) => item.id === rss.user);
        const cate = categoryList.find((item: any) => item.id === rss.cate);
        return (
            <tr
                key={i.toString()}
                className="fk-dragable-row"
            >
                <td>{rss.url}</td>
                <td>{user ? ((user as any).display_name || (user as any).name) : '/'}</td>
                <td>{cate ? (cate as any).name : '/'}</td>
                <td>
                    <Button 
                        onClick={() => {
                            this.setState({editingRow: i, editingRSS: Object.assign({}, rss)});
                        }}
                        type="primary" 
                        size="small" 
                        icon="edit"
                    >
                        编辑
                    </Button>
                    <Divider type="vertical" />
                    <Button 
                        disabled={this.state.editingRow !== -1}
                        onClick={() => {
                            this.state.rssImportList.splice(i, 1);
                            this.updateRSS(this.state.rssImportList);
                        }}
                        type="danger" 
                        size="small" 
                        icon="delete"
                    >
                        删除
                    </Button>
                </td>
            </tr>
        );
    }
    
    editingRow(nav: any, i: number) {
        const { editingRSS } = this.state;
        const { userList, categoryList } = this.props.sharedStore;
        return (
          <tr
            key={`editing-${i}`}
            className="fk-dragable-row"
          >
            <td>
                <Input
                    type="text"
                    name="rss-url"
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
                    onChange={(val: string) => {
                        editingRSS.user = val;
                        this.setState({editingRSS});
                    }}
                >
                    {userList.map((user: any) =>
                        <Option
                            key={user.id}
                            value={user.id}
                        >
                        {user.display_name || user.name}
                        </Option>
                    )}
                </Select>
            </td>
            <td>
              <Select
                value={editingRSS.cate}
                style={{width: '100%'}}
                optionLabelProp="children"
                onChange={(val: string) => {
                  editingRSS.cate = val;
                  this.setState({editingRSS});
                }}
              >
                  {categoryList.map((cate: any) =>
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
                <a 
                    onClick={() => {
                        if (editingRSS.url && editingRSS.user && editingRSS.cate) {
                            this.edit(this.state.editingRow, this.state.editingRSS);
                            this.setState({editingRow: -1, editingRSS: null});
                        }
                    }}
                >
                    保存
                </a>
                <Divider type="vertical" />
                <a 
                    onClick={() => {
                        this.setState({editingRow: -1, editingRSS: null});
                    }}
                >
                    取消
                </a>
            </td>
          </tr>
        );
    }

    edit(idx: any, rss: any) {
        const { rssImportList } = this.state;
        rssImportList[idx] = rss;
        this.updateRSS(rssImportList);
    }

    add() {
        if (!this.state.rssUrl) {
            this.setHasError('new', true);
            return;
        }
        const { selectUser, selectCate, rssImportList } = this.state;
        rssImportList.push({
            url: this.state.rssUrl,
            user: selectUser,
            cate: selectCate
        });
        this.updateRSS(rssImportList);
    }

    setHasError(key: string, error: boolean) {
        this.setState({hasError: Object.assign({}, this.state.hasError, {[key]: error})});
    }

    updateRSS(rssImportList: any[]) {
        this.props.optionsImportStore.saveImportRss({rssImportList: JSON.stringify(rssImportList)})
        .subscribe(
            res => {
                if (res.errno === 0) {
                    message.success('更新成功');
                    window.SysConfig.options.rssImportList = rssImportList;
                    this.setState({
                        rssImportList,
                    });
                }
            },
            err => {
                message.error(err);
            }
        );
    }

    onSubmit() {
        // 
    }

    render() {
        const {rssImportList, selectUser, selectCate} = this.state;
        const { categoryList, userList } = this.props.sharedStore;

        const rows = rssImportList.map((nav, i) =>
            this.state.editingRow !== i ? this.normalRow(nav, i) : this.editingRow(nav, i)
        );

        rows.push(
            <tr key="form">
                <td>
                    <Input
                        type="text"
                        name="rss-url"
                        value={this.state.rssUrl}
                        className={classNames({'has-error': this.state.hasError.new})}
                        onChange={e => {
                            this.setState({rssUrl: e.target.value});
                            if (e.target.value !== '') {
                                this.setHasError('new', false);
                            } else {
                                this.setHasError('new', true);
                            }
                        }}
                    />
                </td>
                <td>
                    <Select
                        value={selectUser}
                        style={{width: '100%'}}
                        optionLabelProp="children"
                        onChange={val => this.setState({selectUser: val})}
                    >
                        {userList.map(user =>
                            <Option
                                key={user.id}
                                value={user.id}
                            >
                                {user.display_name || user.name}
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
                        {categoryList.map(cat =>
                            <Option
                                key={cat.id}
                                value={cat.id}
                            >
                            {cat.name}
                            </Option>
                        )}
                    </Select>
                </td>
                <td>
                    <Button 
                        onClick={() => this.add()}
                        type="primary" 
                        size="small" 
                        icon="plus"
                    >
                        新增
                    </Button>
                </td>
            </tr>
        );
        return (
            <div className="options-import-rss-page">
                <table className="ant-table" style={{width: '100%'}}>
                    <thead className="ant-table-thead">
                        <tr>
                            <th style={{width: '40%'}}>RSS地址</th>
                            <th>导入至用户</th>
                            <th>导入至分类</th>
                            <th style={{width: '20%'}}>操作</th>
                        </tr>
                    </thead>
                    <tbody className="ant-table-tbody" children={rows} />
                </table>
                <span>注：后台会每隔1小时自动抓取 RSS 列表新增内容导入到对应的用户和分类下。</span>
            </div>
        );
    }
}

export default OptionsImportRss;