import * as React from 'react';
import BreadCrumb from '../../../components/breadcrumb';
import { Form, FormInstance } from 'antd';
import { Input, Button, Select } from 'antd';
import { inject, observer } from '@admin/utils/mobx-react';
import { CategoryCreateProps } from './create.model';

const Option = Select.Option;
function CategoryCreate(props: CategoryCreateProps) {
    const [state, setState] = React.useState(() => ({}));
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
        legacy.formRef = React.createRef<FormInstance>();
    }
    legacy.handleSubmit = (values: any) => {
        const { createCategory, updateCategory } = props.categoryStore;
        const id = props.match.params.id;
        const request = id
            ? updateCategory(id, { ...values })
            : createCategory({ ...values });
        request.subscribe((res) => {
            if (res.errno === 0) props.history.push('/cate/list');
        });
    };
    legacy.onMount = function onMount() {
        props.categoryStore.getRootCategory();
        if (props.match.params.id) {
            props.categoryStore.getCategoryInfoById(props.match.params.id);
        } else {
            legacy.setCategoryEmpty();
        }
    };
    legacy.afterUpdate = function afterUpdate(
        prevProps: CategoryCreateProps,
    ) {
        if (prevProps.match.params.id !== props.match.params.id) {
            props.categoryStore.getRootCategory();
            if (props.match.params.id) {
                props.categoryStore.getCategoryInfoById(props.match.params.id);
            } else {
                legacy.setCategoryEmpty();
            }
            return;
        }
        const { categoryInfo } = props.categoryStore;
        legacy.formRef.current?.setFieldsValue({
            name: categoryInfo.name,
            pathname: categoryInfo.pathname,
            description: categoryInfo.description,
            pid: categoryInfo.pid,
        });
    };
    legacy.setCategoryEmpty = function setCategoryEmpty() {
        props.categoryStore.setCurrentCatInfo({
            id: 0,
            name: '',
            pathname: '',
            description: '',
            post_cate: 0,
            pid: 0,
        });
    };
    legacy.render = function render() {
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
                },
            },
        };

        const { rootCategoryList, categoryInfo } = props.categoryStore;
        return (
            <>
                <BreadCrumb className="breadcrumb" {...props} />
                <div className="page-create page-list">
                    <Form
                        ref={legacy.formRef}
                        onFinish={legacy.handleSubmit}
                        scrollToFirstError
                    >
                        <Form.Item
                            {...formItemLayout}
                            label="分类名称"
                            name="name"
                            rules={[
                                {
                                    required: true,
                                    message: '请填写分类名称',
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            {...formItemLayout}
                            label="分类描述"
                            name="description"
                        >
                            <Input.TextArea
                                rows={4}
                                placeholder="用于说明这个分类，并显示在分类页面"
                            />
                        </Form.Item>
                        <Form.Item {...formItemLayout} label="缩略名" name="pathname">
                            <Input />
                        </Form.Item>
                        <Form.Item {...formItemLayout} label="父级分类" name="pid">
                            <Select placeholder="请选择分类">
                                <Option value={0}>不选择</Option>
                                {rootCategoryList
                                    .filter((cate) =>
                                        categoryInfo
                                            ? cate.id !== categoryInfo.id
                                            : true,
                                    )
                                    .map((category, key) => {
                                        return (
                                            <Option
                                                key={(key + 1).toString()}
                                                value={category.id}
                                            >
                                                {category.name}
                                            </Option>
                                        );
                                    })}
                            </Select>
                        </Form.Item>
                        <Form.Item {...tailFormItemLayout}>
                            <Button type="primary" htmlType="submit">
                                提交
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            </>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    const previousRef = React.useRef({ props: props, state: state, mounted: false });
    React.useEffect(() => {
        if (previousRef.current.mounted)
            legacy.afterUpdate(
                previousRef.current.props,
                previousRef.current.state,
            );
        previousRef.current = { props: props, state: state, mounted: true };
    });
    return legacy.render();
}

export default inject('categoryStore', 'sharedStore')(observer(CategoryCreate));
