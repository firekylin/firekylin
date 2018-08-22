import * as React from 'react';
import BreadCrumb from '../../../components/breadcrumb';
import './create.less';
import { Form, Input, Button, Select } from 'antd';
import { inject, observer } from 'mobx-react';
import { CategoryCreateProps } from './create.model';
const FormItem = Form.Item;
const Option = Select.Option;
@inject('categoryStore', 'sharedStore')
@observer
class CategoryCreateForm extends React.Component<CategoryCreateProps, {}> {

    constructor(props: CategoryCreateProps) {
        super(props);
    }

    componentDidMount() {
        this.props.sharedStore.getCategoryList();
    }

    handleSubmit = (e: React.FormEvent<any>) => {
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
        if (!err) {
            console.log('Received values of form: ', values);
            this.props.categoryStore.createCategory(Object.assign({}, values, {pid: 1}));
        }
        });
    }
    render() {
        const { getFieldDecorator } = this.props.form;
        const formItemLayout = {
            labelCol: {
                xl: { span: 2 },
                sm: { span: 8 },
            },
            wrapperCol: {
                xl: { span: 8 },
                sm: { span: 16 },
            },
        };
        const tailFormItemLayout = {
            wrapperCol: {
              xl: {
                span: 16,
                offset: 2,
              }
            },
        };
        
        const { categoryList } = this.props.sharedStore;
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="category-create page-list">
                    <Form onSubmit={this.handleSubmit}>
                        <FormItem
                            {...formItemLayout}
                            label="分类名称"
                        >
                            {getFieldDecorator('name', {
                                rules: [{
                                    required: true, message: '请填写分类名称',
                                }],
                            })(
                                <Input />
                            )}
                        </FormItem>
                        <FormItem
                            {...formItemLayout}
                            label="缩略名"
                        >
                            {getFieldDecorator('pathname')(
                                <Input />
                            )}
                        </FormItem>
                        <FormItem
                            {...formItemLayout}
                            label="父级分类"
                        >
                            {getFieldDecorator('pid', {
                                initialValue: 0
                            })(
                                <Select
                                    placeholder="请选择分类"
                                >
                                    <Option value={0}>不选择</Option>
                                    {categoryList.map((category, key) => {
                                        return <Option key={key} value={category.id}>{category.name}</Option>;
                                    })}
                                </Select>
                            )}
                        </FormItem>
                        <FormItem {...tailFormItemLayout}>
                            <Button type="primary" htmlType="submit">提交</Button>
                        </FormItem>
                    </Form>
                </div>
            </>
        );
    }
}
const CategoryCreate = Form.create()(CategoryCreateForm);
export default CategoryCreate;
