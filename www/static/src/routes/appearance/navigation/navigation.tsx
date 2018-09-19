import { Table, Input, Form, Divider, Button, message } from 'antd';
import React from 'react';
import BreadCrumb from '../../../components/breadcrumb';
import { inject, observer } from 'mobx-react';

const FormItem = Form.Item;
const EditableContext = React.createContext({});

import './navigation.less';

const EditableRow = ({ form, index, ...props }) => (
    <EditableContext.Provider value={form}>
        <tr {...props} />
    </EditableContext.Provider>
);

const EditableFormRow = Form.create()(EditableRow);

class EditableCell extends React.Component<any, any> {

    render() {
        const {
        editing,
        dataIndex,
        title,
        inputType,
        record,
        index,
        ...restProps
        } = this.props;
        return (
            <EditableContext.Consumer>
                {(form: any) => {
                    const { getFieldDecorator } = form;
                    return (
                        <td {...restProps}>
                        {editing ? (
                            <FormItem style={{ margin: 0 }}>
                                {getFieldDecorator(dataIndex, {
                                    rules: [{
                                        required: true,
                                        message: `请输入 ${title}!`,
                                    }],
                                    initialValue: record[dataIndex],
                                })(
                                    <Input />
                                )}
                            </FormItem>
                        ) : restProps.children}
                        </td>
                    );
                }}
            </EditableContext.Consumer>
        );
    }
}
@inject('navigationStore')
@observer
class Navigation extends React.Component<any, any> {
    state = this.initialState();
    columns: any[] = [];

    initialState() {
        const options = window.SysConfig.options;
        if (!options.navigation) {
            options.navigation = [];
        } else if (typeof(options.navigation) === 'string') {
            options.navigation = JSON.parse(options.navigation);
        }
        options.navigation = options.navigation.map((item, key) => {
            item.key = key.toString();
            return item;
        });
        return {
            list: options.navigation,
            editingRow: -1,
            editingNav: null,
            editingKey: '',
            row: {
                label: '',
                url: '',
                option: ''
            }
        };
    }
    constructor(props: any) {
        super(props);
        this.columns = [
            {
                title: '菜单文本',
                dataIndex: 'label',
                editable: true,
            },
            {
                title: '菜单地址',
                dataIndex: 'url',
                editable: true,
            },
            {
                title: '菜单属性',
                dataIndex: 'option',
                editable: true,
            },
            {
                title: '操作',
                width: '40%',
                dataIndex: 'operation',
                render: (text, record, i) => {
                    const editable = this.isEditing(record);
                    return (
                        <div>
                        {editable ? (
                            <span>
                                <EditableContext.Consumer>
                                    {form => (
                                        <a
                                            href="javascript:;"
                                            onClick={() => this.save(form, record.key)}
                                            style={{ marginRight: 8 }}
                                        >
                                            保存
                                        </a>
                                    )}
                                </EditableContext.Consumer>
                                <a onClick={() => this.cancel(record.key)}>取消</a>
                            </span>
                        ) : (
                            <span>
                                <Button 
                                    disabled={i === 0}
                                    onClick={() => this.move(i - 1, i)}
                                    type="success" 
                                    size="small" 
                                    icon="arrow-up"
                                >
                                    上移
                                </Button>
                                <Divider type="vertical" />
                                <Button 
                                    disabled={i === this.state.list.length - 1}
                                    onClick={() => this.move(i, i + 1)}
                                    type="primary" 
                                    size="small" 
                                    icon="arrow-down"
                                >
                                    下移
                                </Button>
                                <Divider type="vertical" />
                                <Button 
                                    onClick={() => this.edit(record.key)}
                                    type="primary" 
                                    size="small" 
                                    icon="edit"
                                >
                                    编辑
                                </Button>
                                <Divider type="vertical" />
                                <Button 
                                    onClick={() => this.delete(record)}
                                    type="danger" 
                                    size="small" 
                                    icon="delete"
                                >
                                    删除
                                </Button>
                            </span>
                        )}
                        </div>
                    );
                },
            },
        ];
    }

    isEditing = (record) => {
        return record.key === this.state.editingKey;
    }

    move(a: number, b: number) {
        let c = this.state.list[a];
        this.state.list[a] = this.state.list[b];
        this.state.list[b] = c;
        this.updateNav('移动成功');
    }

    edit(key: any) {
        this.setState({ editingKey: key });
    }

    delete(record: any) {
        const list = this.state.list.filter((item => item.key !== record.key));
        this.props.navigationStore.update(list)
        .subscribe(
            () => {
                message.success('删除成功');
                this.setState({list});
            }
        );
    }

    save(form: any, key: any) {
        form.validateFields((error, row) => {
            if (error) {
                return;
            }
            const newData = [...this.state.list];
            const index = newData.findIndex(item => key === item.key);
            if (index > -1) {
                const item = newData[index];
                newData.splice(index, 1, {
                    ...item,
                    ...row,
                });
                this.setState({ data: newData, editingKey: '' });
                this.updateNav('保存成功', newData);
            } else {
                newData.push(row);
                this.setState({ data: newData, editingKey: '' });
                this.updateNav('保存成功', newData);
            }
        });
    }

    cancel = (key: any) => {
        this.setState({ editingKey: '' });
    }

    add() {
        this.state.list.push(this.state.row);
        this.updateNav('添加成功');
    }
    updateNav(messageText: string, data?: any) {
        const list = data || this.state.list;
        this.props.navigationStore.update(list)
        .subscribe(
            () => {
                message.success(messageText);
                window.SysConfig.options.navigation = list;
                this.setState({list: list});
            },
            err => {
                message.error(err);
            }
        );
    }

    render() {
        const components = {
            body: {
                row: EditableFormRow,
                cell: EditableCell,
            },
        };

        const columns = this.columns.map((col) => {
            if (!col.editable) {
                return col;
            }
            return {
                ...col,
                onCell: record => ({
                    record,
                    inputType: 'text',
                    dataIndex: col.dataIndex,
                    title: col.title,
                    editing: this.isEditing(record),
                }),
            };
        });

        return (
            <div className="navigation-page">
                <BreadCrumb {...this.props} />
                <Table
                    rowKey="key"
                    className="page-list"
                    components={components}
                    bordered={true}
                    dataSource={this.state.list}
                    columns={columns}
                    rowClassName={() => 'editable-row'}
                    pagination={false}
                />
                <table className="navigation-add-row">
                    <tbody>
                        <tr>
                            <td><Input onChange={e => this.setState({row: Object.assign({}, this.state.row, {label: e.target.value})})} /></td>
                            <td><Input onChange={e => this.setState({row: Object.assign({}, this.state.row, {url: e.target.value})})} /></td>
                            <td><Input onChange={e => this.setState({row: Object.assign({}, this.state.row, {option: e.target.value})})} /></td>
                            <td>
                                <Button 
                                    onClick={() => this.add()}
                                    type="primary" 
                                    size="small" 
                                >
                                    新增
                                </Button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

export default Navigation;