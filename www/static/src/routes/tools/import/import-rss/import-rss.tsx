import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Input, Divider, Button, message, Select } from 'antd';
import React from 'react';
import { inject, observer } from '@admin/utils/mobx-react';
import 'antd/lib/table/style/index';
import classNames from 'classnames';

const Option = Select.Option;
function createImportRssState() {
    const options = window.SysConfig.options;
    if (!options.rssImportList) options.rssImportList = [];
    else if (typeof options.rssImportList === 'string') options.rssImportList = JSON.parse(options.rssImportList);
    return {
        key: 'normal', editingRow: -1, selectCate: '', selectUser: '', uploading: false,
        uploadType: 'wordpress', rssImportList: options.rssImportList,
        editingRSS: {url: '', user: '', cate: ''}, hasError: {new: false}, rssUrl: '',
    };
}
function OptionsImportRss(props: any) {
    const [state, setState] = React.useState(createImportRssState);
    const legacyRef = React.useRef({});
    const legacy = legacyRef.current as any;
    legacy.state = state;
    legacy.setState = (update: any, callback?: () => void) => {
        setState((previous: any) => {
            const next = {
                ...previous,
                ...(typeof update === 'function' ? update(previous, props) : update),
            };
            legacy.state = next;
            return next;
        });
        if (callback) queueMicrotask(callback);
    };
    if (!legacy.__initialized) {
        legacy.__initialized = true;
    }
    legacy.initState = function initState() {
        let options = window.SysConfig.options;
        if (!options.rssImportList) {
            options.rssImportList = [];
        } else if (typeof options.rssImportList === 'string') {
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
                new: false,
            },
            rssUrl: '',
        };
    };
    legacy.onMount = function onMount() {
        props.sharedStore.getCategoryList();
        legacy.getUserList();
    };
    legacy.getUserList = function getUserList() {
        props.sharedStore
            .getUserList()
            .toPromise()
            .then((res) => {
                if (res.errno === 0 && res.data.length > 0) {
                    props.sharedStore.setUserList(res.data);
                    legacy.setState({ selectUser: res.data[0].id });
                }
            })
            .catch((err) => {
                message.error('加载用户列表失败，请稍后重试');
            });
    };
    legacy.normalRow = function normalRow(rss: any, i: number) {
        const { userList, categoryList } = props.sharedStore;
        const user = userList.find((item: any) => item.id === rss.user);
        const cate = categoryList.find((item: any) => item.id === rss.cate);
        return (
            <tr key={i.toString()} className="fk-dragable-row">
                <td>{rss.url}</td>
                <td>{user ? (user as any).display_name || (user as any).name : '/'}</td>
                <td>{cate ? (cate as any).name : '/'}</td>
                <td>
                    <Button
                        onClick={() => {
                            legacy.setState({
                                editingRow: i,
                                editingRSS: Object.assign({}, rss),
                            });
                        }}
                        type="primary"
                        size="small"
                        icon={<EditOutlined />}
                    >
                        编辑
                    </Button>
                    <Divider type="vertical" />
                    <Button
                        disabled={legacy.state.editingRow !== -1}
                        onClick={() => {
                            legacy.state.rssImportList.splice(i, 1);
                            legacy.updateRSS(legacy.state.rssImportList);
                        }}
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                    >
                        删除
                    </Button>
                </td>
            </tr>
        );
    };
    legacy.editingRow = function editingRow(nav: any, i: number) {
        const { editingRSS } = legacy.state;
        const { userList, categoryList } = props.sharedStore;
        return (
            <tr key={`editing-${i}`} className="fk-dragable-row">
                <td>
                    <Input
                        type="text"
                        name="rss-url"
                        defaultValue={editingRSS.url}
                        onChange={(e) => {
                            editingRSS.url = e.target.value;
                            legacy.setState({ editingRSS });
                        }}
                    />
                </td>
                <td>
                    <Select
                        value={editingRSS.user}
                        style={{ width: '100%' }}
                        optionLabelProp="children"
                        onChange={(val: string) => {
                            editingRSS.user = val;
                            legacy.setState({ editingRSS });
                        }}
                    >
                        {userList.map((user: any) => (
                            <Option key={user.id} value={user.id}>
                                {user.display_name || user.name}
                            </Option>
                        ))}
                    </Select>
                </td>
                <td>
                    <Select
                        value={editingRSS.cate}
                        style={{ width: '100%' }}
                        optionLabelProp="children"
                        onChange={(val: string) => {
                            editingRSS.cate = val;
                            legacy.setState({ editingRSS });
                        }}
                    >
                        {categoryList.map((cate: any) => (
                            <Option key={cate.id} value={cate.id}>
                                {cate.name}
                            </Option>
                        ))}
                    </Select>
                </td>
                <td>
                    <a
                        onClick={() => {
                            if (editingRSS.url && editingRSS.user && editingRSS.cate) {
                                legacy.edit(
                                    legacy.state.editingRow,
                                    legacy.state.editingRSS,
                                );
                                legacy.setState({ editingRow: -1, editingRSS: null });
                            }
                        }}
                    >
                        保存
                    </a>
                    <Divider type="vertical" />
                    <a
                        onClick={() => {
                            legacy.setState({ editingRow: -1, editingRSS: null });
                        }}
                    >
                        取消
                    </a>
                </td>
            </tr>
        );
    };
    legacy.edit = function edit(idx: any, rss: any) {
        const { rssImportList } = legacy.state;
        rssImportList[idx] = rss;
        legacy.updateRSS(rssImportList);
    };
    legacy.add = function add() {
        if (!legacy.state.rssUrl) {
            legacy.setHasError('new', true);
            return;
        }
        const { selectUser, selectCate, rssImportList } = legacy.state;
        rssImportList.push({
            url: legacy.state.rssUrl,
            user: selectUser,
            cate: selectCate,
        });
        legacy.updateRSS(rssImportList);
    };
    legacy.setHasError = function setHasError(key: string, error: boolean) {
        legacy.setState({
            hasError: Object.assign({}, legacy.state.hasError, { [key]: error }),
        });
    };
    legacy.updateRSS = function updateRSS(rssImportList: any[]) {
        props.optionsImportStore
            .saveImportRss({ rssImportList: JSON.stringify(rssImportList) })
            .subscribe(
                (res) => {
                    if (res.errno === 0) {
                        message.success('更新成功');
                        window.SysConfig.options.rssImportList = rssImportList;
                        legacy.setState({
                            rssImportList,
                        });
                    }
                },
                (err) => {
                    message.error(err);
                },
            );
    };
    legacy.onSubmit = function onSubmit() {
        //
    };
    legacy.render = function render() {
        const { rssImportList, selectUser, selectCate } = legacy.state;
        const { categoryList, userList } = props.sharedStore;

        const rows = rssImportList.map((nav, i) =>
            legacy.state.editingRow !== i
                ? legacy.normalRow(nav, i)
                : legacy.editingRow(nav, i),
        );

        rows.push(
            <tr key="form">
                <td>
                    <Input
                        type="text"
                        name="rss-url"
                        value={legacy.state.rssUrl}
                        className={classNames({
                            'has-error': legacy.state.hasError.new,
                        })}
                        onChange={(e) => {
                            legacy.setState({ rssUrl: e.target.value });
                            if (e.target.value !== '') {
                                legacy.setHasError('new', false);
                            } else {
                                legacy.setHasError('new', true);
                            }
                        }}
                    />
                </td>
                <td>
                    <Select
                        value={selectUser}
                        style={{ width: '100%' }}
                        optionLabelProp="children"
                        onChange={(val) => legacy.setState({ selectUser: val })}
                    >
                        {userList.map((user) => (
                            <Option key={user.id} value={user.id}>
                                {user.display_name || user.name}
                            </Option>
                        ))}
                    </Select>
                </td>
                <td>
                    <Select
                        value={selectCate}
                        style={{ width: '100%' }}
                        optionLabelProp="children"
                        onChange={(val) => legacy.setState({ selectCate: val })}
                    >
                        {categoryList.map((cat) => (
                            <Option key={cat.id} value={cat.id}>
                                {cat.name}
                            </Option>
                        ))}
                    </Select>
                </td>
                <td>
                    <Button
                        onClick={() => legacy.add()}
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                    >
                        新增
                    </Button>
                </td>
            </tr>,
        );
        return (
            <div className="options-import-rss-page">
                <table className="ant-table" style={{ width: '100%' }}>
                    <thead className="ant-table-thead">
                        <tr>
                            <th style={{ width: '40%' }}>RSS地址</th>
                            <th>导入至用户</th>
                            <th>导入至分类</th>
                            <th style={{ width: '20%' }}>操作</th>
                        </tr>
                    </thead>
                    <tbody className="ant-table-tbody" children={rows} />
                </table>
                <span>
                    注：后台会每隔1小时自动抓取 RSS
                    列表新增内容导入到对应的用户和分类下。
                </span>
            </div>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    return legacy.render();
}

export default inject('sharedStore', 'optionsImportStore')(observer(OptionsImportRss));
