import { Table, Input, InputNumber, Popconfirm, Form, Divider } from 'antd';
import React from 'react';
import BreadCrumb from '../../../components/breadcrumb';
import { inject, observer } from 'mobx-react';

const FormItem = Form.Item;
const EditableContext = React.createContext({});

const EditableRow = ({ form, index, ...props }) => (
    <EditableContext.Provider value={form}>
        <tr {...props} />
    </EditableContext.Provider>
);

const EditableFormRow = Form.create()(EditableRow);

@inject('navigationStore')
@observer
class EditableCell extends React.Component<any, any> {
    getInput = () => {
        if (this.props.inputType === 'number') {
        return <InputNumber />;
        }
        return <Input />;
    }

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
                            message: `Please Input ${title}!`,
                            }],
                            initialValue: record[dataIndex],
                        })(this.getInput())}
                        </FormItem>
                    ) : restProps.children}
                    </td>
                );
            }}
        </EditableContext.Consumer>
        );
    }
}

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
            editingKey: ''
        };
    }
    constructor(props: any) {
        super(props);
        this.columns = [
        {
            title: '菜单文本',
            dataIndex: 'label',
            width: '25%',
            editable: true,
        },
        {
            title: '菜单地址',
            dataIndex: 'url',
            width: '15%',
            editable: true,
        },
        {
            title: '菜单属性',
            dataIndex: 'option',
            width: '40%',
            editable: true,
        },
        {
            title: '操作',
            dataIndex: 'operation',
            render: (text, record) => {
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
                            <a onClick={() => this.edit(record.key)}>编辑</a>
                            <Divider type="vertical" />
                            <a className="a-button-danger" onClick={() => this.delete(record)}>删除</a>
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

    edit(key: any) {
        console.log(key);
        this.setState({ editingKey: key });
    }

    delete(record: any) {
        this.props.navigationStore.delete();
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
        } else {
            newData.push(row);
            this.setState({ data: newData, editingKey: '' });
        }
        });
    }

    cancel = (key: any) => {
        this.setState({ editingKey: '' });
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
            <div>
                <BreadCrumb {...this.props} />
                <Table
                    className="page-list"
                    components={components}
                    bordered={true}
                    dataSource={this.state.list}
                    columns={columns}
                    rowClassName={() => 'editable-row'}
                    pagination={false}
                />
            </div>
        );
    }
}

export default Navigation;