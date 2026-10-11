import React from 'react';
import { Button, Form, FormInstance, InputNumber, Select, Switch } from 'antd';
import { inject, observer } from 'mobx-react';
import BreadCrumb from '../../../components/breadcrumb';
import './comment.less';
import { CommentProps, CommentState } from './comment.model';

@inject('commentStore')
@observer
class CommentForm extends React.Component<CommentProps, CommentState> {
    formRef = React.createRef<FormInstance>();

    state = {
        comment: {audit: false, forceLogin: false, pageSize: 10, locale: 'zh-CN', ipQps: 60},
        submitting: false,
    };

    constructor(props: CommentProps) {
        super(props);
        let comment = window.SysConfig.options.comment;
        try {
            if (typeof comment === 'string') comment = JSON.parse(comment);
        } catch (e) {
            comment = {};
        }
        comment = comment && typeof comment === 'object' ? comment : {};
        this.state = {
            submitting: false,
            comment: {
                audit: Boolean(comment.audit),
                forceLogin: Boolean(comment.forceLogin),
                pageSize: Number(comment.pageSize) || 10,
                locale: comment.locale || 'zh-CN',
                ipQps: Number(comment.ipQps) || 60,
            },
        };
    }

    handleSubmit = (values: any) => {
        this.props.commentStore.commentSave({
            audit: Boolean(values.audit),
            forceLogin: Boolean(values.forceLogin),
            pageSize: values.pageSize,
            locale: values.locale,
            ipQps: values.ipQps,
        });
    }

    render() {
        const {comment, submitting} = this.state;
        return <>
            <BreadCrumb className="breadcrumb" {...this.props} />
            <div className="page-list">
                <h3 className="page-title">评论设置</h3>
                <div className="option-comment-page">
                    <Form ref={this.formRef} onFinish={this.handleSubmit} layout="vertical">
                        <Form.Item label="评论需要审核" name="audit" valuePropName="checked" initialValue={comment.audit}><Switch /></Form.Item>
                        <Form.Item label="必须登录后评论" name="forceLogin" valuePropName="checked" initialValue={comment.forceLogin}><Switch /></Form.Item>
                        <Form.Item label="每页评论数" name="pageSize" initialValue={comment.pageSize} rules={[{required: true}]}><InputNumber min={1} max={100} /></Form.Item>
                        <Form.Item label="界面语言" name="locale" initialValue={comment.locale}><Select options={[{value: 'zh-CN', label: '简体中文'}, {value: 'en-US', label: 'English'}]} /></Form.Item>
                        <Form.Item label="同 IP 评论间隔（秒）" name="ipQps" initialValue={comment.ipQps}><InputNumber min={1} max={3600} /></Form.Item>
                        <Form.Item><Button type="primary" htmlType="submit" loading={submitting}>提交</Button></Form.Item>
                    </Form>
                </div>
            </div>
        </>;
    }
}

export default CommentForm;
