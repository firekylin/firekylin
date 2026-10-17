import {
    ArrowDownOutlined,
    ArrowUpOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
} from '@ant-design/icons';

import { Input, Divider, Button, message } from 'antd';
import React from 'react';
import { inject, observer } from '@admin/utils/mobx-react';
import classNames from 'classnames';
import BreadCrumb from '../../../components/breadcrumb';
import './navigation.less';
function createNavigationState() {
    const options = window.SysConfig.options;
    if (!options.navigation) options.navigation = [];
    else if (typeof options.navigation === 'string') options.navigation = JSON.parse(options.navigation);
    options.navigation = options.navigation.map((item, key) => {
        if (!item) return item;
        item.key = key.toString();
        return item;
    });
    return {
        list: options.navigation, editingRow: -1,
        editingNav: {label: '', url: '', option: ''},
        hasError: {label: false, url: false, option: false, new: false},
        row: {label: '', url: '', option: ''},
    };
}
function Navigation(props: any) {
    const [state, setState] = React.useState(createNavigationState);
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
        legacy.columns = [];
    }
    legacy.initialState = function initialState() {
        const options = window.SysConfig.options;
        if (!options.navigation) {
            options.navigation = [];
        } else if (typeof options.navigation === 'string') {
            options.navigation = JSON.parse(options.navigation);
        }
        options.navigation = options.navigation.map((item, key) => {
            if (!item) {
                return;
            }
            item.key = key.toString();
            return item;
        });
        return {
            list: options.navigation,
            editingRow: -1,
            editingNav: {
                label: '',
                url: '',
                option: '',
            },
            hasError: {
                label: false,
                url: false,
                option: false,
                new: false,
            },
            row: {
                label: '',
                url: '',
                option: '',
            },
        };
    };
    legacy.onMount = function onMount() {
        //
    };
    legacy.normalRow = function normalRow(nav: any, i: number) {
        return (
            <tr key={i.toString()} className="fk-dragable-row">
                <td>{nav.label}</td>
                <td>{nav.url}</td>
                <td>{nav.option}</td>
                <td>
                    <Button
                        disabled={i === 0}
                        onClick={() => legacy.move(i - 1, i)}
                        className="fk-btn-success"
                        size="small"
                        icon={<ArrowUpOutlined />}
                    >
                        上移
                    </Button>
                    <Divider type="vertical" />
                    <Button
                        disabled={i === legacy.state.list.length - 1}
                        onClick={() => legacy.move(i, i + 1)}
                        className="fk-btn-success"
                        type="primary"
                        size="small"
                        icon={<ArrowDownOutlined />}
                    >
                        下移
                    </Button>
                    <Divider type="vertical" />
                    <Button
                        onClick={() =>
                            legacy.setState({
                                editingRow: i,
                                editingNav: Object.assign({}, nav),
                            })
                        }
                        type="primary"
                        size="small"
                        icon={<EditOutlined />}
                    >
                        编辑
                    </Button>
                    <Divider type="vertical" />
                    <Button
                        type="primary"
                        danger
                        onClick={() => legacy.delete(i)}
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
        const { editingNav } = legacy.state;
        return (
            <tr key={`editing-${i}`} className="fk-dragable-row">
                <td>
                    <Input
                        value={legacy.state.editingNav.label}
                        type="text"
                        name="label"
                        className={classNames({
                            'has-error': legacy.state.hasError.label,
                        })}
                        onChange={(e) => {
                            editingNav.label = e.target.value;
                            legacy.setState({ editingNav });
                            if (e.target.value !== '') {
                                legacy.setHasError('label', false);
                            } else {
                                legacy.setHasError('label', true);
                            }
                        }}
                    />
                </td>
                <td>
                    <Input
                        value={legacy.state.editingNav.url}
                        type="text"
                        name="label"
                        className={classNames({
                            'has-error': legacy.state.hasError.url,
                        })}
                        onChange={(e) => {
                            editingNav.url = e.target.value;
                            legacy.setState({ editingNav });
                            if (e.target.value !== '') {
                                legacy.setHasError('url', false);
                            } else {
                                legacy.setHasError('url', true);
                            }
                        }}
                    />
                </td>
                <td>
                    <Input
                        value={legacy.state.editingNav.option}
                        type="text"
                        name="option"
                        className={classNames({
                            'has-error': legacy.state.hasError.option,
                        })}
                        onChange={(e) => {
                            editingNav.option = e.target.value;
                            legacy.setState({ editingNav });
                            if (e.target.value !== '') {
                                legacy.setHasError('option', false);
                            } else {
                                legacy.setHasError('option', true);
                            }
                        }}
                    />
                </td>
                <td>
                    <a
                        onClick={() => {
                            if (
                                editingNav.label &&
                                editingNav.url &&
                                editingNav.option
                            ) {
                                legacy.edit(
                                    legacy.state.editingRow,
                                    legacy.state.editingNav,
                                );
                                legacy.setState({ editingRow: -1, editingNav: null });
                            }
                        }}
                    >
                        保存
                    </a>
                    <Divider type="vertical" />
                    <a
                        onClick={() => {
                            legacy.setState({ editingRow: -1, editingNav: null });
                        }}
                    >
                        取消
                    </a>
                </td>
            </tr>
        );
    };
    legacy.move = function move(a: number, b: number) {
        let c = legacy.state.list[a];
        legacy.state.list[a] = legacy.state.list[b];
        legacy.state.list[b] = c;
        legacy.updateNav('移动成功');
    };
    legacy.edit = function edit(idx: any, nav: any) {
        const { list } = legacy.state;
        list[idx] = nav;
        legacy.updateNav('保存成功');
    };
    legacy.delete = function (key: number) {
        const list = legacy.state.list.filter((item) => item.key !== key.toString());

        legacy.updateNav('删除成功', list);
    };
    legacy.add = function add() {
        if (
            !legacy.state.row.label ||
            !legacy.state.row.url ||
            !legacy.state.row.option
        ) {
            legacy.setHasError('new', true);
            return;
        }
        legacy.state.list.push(legacy.state.row);
        legacy.updateNav('添加成功');
        legacy.resetRow();
    };
    legacy.resetRow = function resetRow() {
        legacy.setState({
            row: {
                label: '',
                url: '',
                option: '',
            },
        });
    };
    legacy.setHasError = function setHasError(key: string, error: boolean) {
        legacy.setState({
            hasError: Object.assign({}, legacy.state.hasError, { [key]: error }),
        });
    };
    legacy.updateNav = function updateNav(messageText: string, data?: any) {
        let list = data || legacy.state.list;
        props.navigationStore.update(list).subscribe(
            (res) => {
                if (res.errno === 0) {
                    message.success(messageText);
                    list = list.map((item, key) => {
                        if (!item) {
                            return;
                        }
                        item.key = key.toString();
                        return item;
                    });
                    window.SysConfig.options.navigation = list;
                    legacy.setState({ list: list });
                }
            },
            (err) => {
                message.error(err);
            },
        );
    };
    legacy.render = function render() {
        const rows = legacy.state.list.map((nav, i) => {
            if (!nav) {
                return null;
            }
            return legacy.state.editingRow !== i
                ? legacy.normalRow(nav, i)
                : legacy.editingRow(nav, i);
        });

        rows.push(
            <tr key="form">
                <td>
                    <Input
                        value={legacy.state.row.label}
                        type="text"
                        name="label"
                        className={classNames({
                            'has-error': legacy.state.hasError.new,
                        })}
                        onChange={(e) => {
                            legacy.setState({
                                row: Object.assign({}, legacy.state.row, {
                                    label: e.target.value,
                                }),
                            });
                            if (e.target.value !== '') {
                                legacy.setHasError('new', false);
                            } else {
                                legacy.setHasError('new', true);
                            }
                        }}
                    />
                </td>
                <td>
                    <Input
                        value={legacy.state.row.url}
                        type="url"
                        name="label"
                        className={classNames({
                            'has-error': legacy.state.hasError.new,
                        })}
                        onChange={(e) => {
                            legacy.setState({
                                row: Object.assign({}, legacy.state.row, {
                                    url: e.target.value,
                                }),
                            });
                            if (e.target.value !== '') {
                                legacy.setHasError('new', false);
                            } else {
                                legacy.setHasError('new', true);
                            }
                        }}
                    />
                </td>
                <td>
                    <Input
                        value={legacy.state.row.option}
                        type="option"
                        name="label"
                        className={classNames({
                            'has-error': legacy.state.hasError.new,
                        })}
                        onChange={(e) => {
                            legacy.setState({
                                row: Object.assign({}, legacy.state.row, {
                                    option: e.target.value,
                                }),
                            });
                            if (e.target.value !== '') {
                                legacy.setHasError('new', false);
                            } else {
                                legacy.setHasError('new', true);
                            }
                        }}
                    />
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
            <div>
                <BreadCrumb {...props} />
                <div className="navigation-page page-list">
                    <table
                        className="ant-table ant-table-bordered"
                        style={{ width: '100%' }}
                    >
                        <thead className="ant-table-thead">
                            <tr>
                                <th>菜单文本</th>
                                <th>菜单地址</th>
                                <th>菜单属性</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody className="ant-table-tbody" children={rows} />
                    </table>
                </div>
            </div>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    return legacy.render();
}

export default inject(
    'sharedStore',
    'navigationStore',
    'optionsImportStore',
)(observer(Navigation));
