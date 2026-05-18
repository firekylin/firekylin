import React, { useState, useEffect, useRef } from 'react';
import { Form } from 'antd';
import { Input, Button, message } from 'antd';
import { TagAPI } from '../tag.api';
import { TagCreateOrEditProps } from './create-or-edit.model';
import { tap } from 'rxjs/operators';
import BreadCrumb from '../../../components/breadcrumb';
import { Tag } from '../../../models/tag.model';
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
function TagCreateOrEditForm(props: TagCreateOrEditProps) {
    const id = props.match.params.id;
    const [loading, setLoading] = useState(false);
    const [tag, setTag] = useState<Tag>({
        id: 0,
        name: '',
        pathname: '',
        post_tag: 0
    });
    const [form] = Form.useForm();

    useEffect(
        () => {
            if (id) {
                queryTagById();
            } else {
                setTagEmpty();
            }
        }
    ,   [id]);

    useEffect(() => {
        form.setFieldsValue({
            name: tag.name,
            pathname: tag.pathname,
        });
    }, [tag]);

    function queryTagById() {
        TagAPI.queryTagById(id)
        .subscribe(
            res => setTag(res.data)
        );
    }

    // 置空Create列表
    function setTagEmpty() {
        setTag({
            id: 0,
            name: '',
            pathname: '',
            post_tag: 0
        });
    }

    function handleSubmit (values: any) {
        setLoading(true);
        if (id) {
            TagAPI.tagUpdateById(id, Object.assign({}, values))
            .pipe(tap(() => setLoading(false)))
            .subscribe(
                res => {
                    if (res.errno === 0) {
                        message.success('更新标签成功');
                        props.history.push('/tag/list');
                    } else {
                        message.error(res.errmsg);
                    }
                }
            );
        } else {
            TagAPI.tagCreate(Object.assign({}, values))
            .pipe(tap(() => setLoading(false)))
            .subscribe(
                res => {
                    if (res.errno === 0) {
                        props.history.push('/tag/list');
                    }
                }
            );
        }
    }

    return (
        <>
            <BreadCrumb className="breadcrumb" {...props} />
            <div className="page-create page-list">
                <Form form={form} onFinish={handleSubmit} scrollToFirstError>
                    <Form.Item
                        {...formItemLayout}
                        label="标签名称"
                        name="name"
                        rules={[{
                            required: true, message: '请填写标签名称',
                        }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        {...formItemLayout}
                        label="缩略名"
                        name="pathname"
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item {...tailFormItemLayout}>
                        <Button type="primary" htmlType="submit" loading={loading}>提交</Button>
                    </Form.Item>
                </Form>
            </div>
        </>
    );
}
export default TagCreateOrEditForm;
