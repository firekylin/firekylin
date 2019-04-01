import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message } from 'antd';
import { TagAPI } from '../tag.api';
import { TagCreateOrEditProps } from './create-or-edit.model';
import { tap } from 'rxjs/operators';
import BreadCrumb from '../../../components/breadcrumb';
import { Tag } from '../../../models/tag.model';
const FormItem = Form.Item;
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
    const { getFieldDecorator } = props.form;

    useEffect(
        () => {
            if (id) {
                queryTagById();
            } else {
                setTagEmpty();
            }
        }
    ,   []);

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

    function handleSubmit (e: React.FormEvent<any>) {
        e.preventDefault();
        props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
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
        });
    }
        
    return (
        <>
            <BreadCrumb className="breadcrumb" {...props} />
            <div className="page-create page-list">
                <Form onSubmit={e => handleSubmit(e)}>
                    <FormItem
                        {...formItemLayout}
                        label="标签名称"
                    >
                        {getFieldDecorator('name', {
                            rules: [{
                                required: true, message: '请填写标签名称',
                            }],
                            initialValue: tag ? tag.name : '',
                        })(
                            <Input />
                        )}
                    </FormItem>
                    <FormItem
                        {...formItemLayout}
                        label="缩略名"
                    >
                        {getFieldDecorator('pathname', {
                            initialValue: tag ? tag.pathname : ''
                        })(
                            <Input />
                        )}
                    </FormItem>
                    <FormItem {...tailFormItemLayout}>
                        <Button type="primary" htmlType="submit" loading={loading}>提交</Button>
                    </FormItem>
                </Form>
            </div>
        </>
    );
}
const TagCreateOrEdit = Form.create()(TagCreateOrEditForm);
export default TagCreateOrEdit;
