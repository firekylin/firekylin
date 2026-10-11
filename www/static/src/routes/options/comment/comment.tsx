import React from 'react';
import { Form, FormInstance } from 'antd';
import { Input, Button, Radio, Modal, Switch, InputNumber, Select } from 'antd';
import { inject, observer } from 'mobx-react';
import BreadCrumb from '../../../components/breadcrumb';
import './comment.less';
import { CommentProps, CommentState } from './comment.model';
import { RadioChangeEvent } from 'antd';

const RadioGroup = Radio.Group;
const TextArea = Input.TextArea;

@inject('commentStore')
@observer
class CommentForm extends React.Component<CommentProps, CommentState> {
    formRef = React.createRef<FormInstance>();

    state = {
        comment: {
           type: '',
           name: '',
           audit: false,
           forceLogin: false,
           pageSize: 10,
           locale: 'zh-CN',
           ipQps: 60,
        },
        submitting: false,
    };
    constructor(props: CommentProps) {
        super(props);
        let comment = window.SysConfig.options.comment;
        try {
            if (typeof comment === 'string') {
                comment = JSON.parse(comment);
            }
        } catch (e) {
            comment = {};
        }
        comment = comment && typeof comment === 'object' ? comment : {};
        const name = typeof comment.name === 'string' && comment.name !== 'undefined'
            ? unescape(comment.name) : '';
        this.state = {
            submitting: false,
            comment: {
                type: comment.type || 'disqus',
                name,
                audit: Boolean(comment.audit),
                forceLogin: Boolean(comment.forceLogin),
                pageSize: Number(comment.pageSize) || 10,
                locale: comment.locale || 'zh-CN',
                ipQps: Number(comment.ipQps) || 60
            }
        };
    }

    openDialog() {
        const comment = this.state.comment;
        if (comment.type === 'custom') {
            return;
        }
        const url = `/static/img/${comment.type}.jpg`;
        const content = (
            <div className="center">
                <a href={url} target="_blank"><img src={url} style={{maxWidth: '100%'}} /></a>
            </div>
        );

        Modal.info({
            title: '提示',
            content: content,
            width: '700px',
        });
    }

    handleChange(e: RadioChangeEvent) {
        const type = e.target.value;
        this.setState({comment: {...this.state.comment, type}}, () => {
            const field = this.isCommentTypeSite() ? 'site' : 'code';
            if (this.formRef.current?.getFieldValue(field) == null) {
                this.formRef.current?.setFieldsValue({[field]: ''});
            }
        });
    }

    handleSubmit = (values: any) => {
        const params = {
            name: this.isCommentTypeSite() ? values.site : values.code,
            type: values.type,
            ...(values.type === 'waline-native' ? {
                name: '', audit: Boolean(values.audit), forceLogin: Boolean(values.forceLogin),
                pageSize: values.pageSize, locale: values.locale, ipQps: values.ipQps
            } : {})
        };
        this.props.commentStore.commentSave(params);
    }

    // 评论类型是否是网站
    isCommentTypeSite() {
        return ['custom', 'gitalk', 'valine', 'waline'].indexOf(this.state.comment.type) === -1;
    }

    render() {
        const { comment, submitting } = this.state;
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="page-list">
                    <h3 className="page-title">评论设置</h3>
                    <div className="option-comment-page">
                        <Form ref={this.formRef} onFinish={this.handleSubmit} layout="vertical" scrollToFirstError>
                            <Form.Item
                                label="评论类型"
                                name="type"
                                initialValue={comment.type}
                            >
                                <RadioGroup
                                    onChange={e => this.handleChange(e)}
                                >
                                    <Radio value="waline">Waline（<a href="https://waline.js.org" target="_blank">官网</a>）</Radio>
                                    <Radio value="waline-native">内置 Waline</Radio>
                                    <Radio value="valine">Valine</Radio>
                                    <Radio value="disqus">Disqus</Radio>
                                    <Radio value="hypercomments">HyperComments</Radio>
                                    <Radio value="changyan">畅言</Radio>
                                    <Radio value="gitalk">Gitalk</Radio>
                                    <Radio value="custom">自定义</Radio>
                                </RadioGroup>
                            </Form.Item>
                            { comment.type === 'waline-native' ?
                                <div className="comment-content">
                                    <Form.Item label="评论需要审核" name="audit" valuePropName="checked" initialValue={comment.audit}><Switch /></Form.Item>
                                    <Form.Item label="必须登录后评论" name="forceLogin" valuePropName="checked" initialValue={comment.forceLogin}><Switch /></Form.Item>
                                    <Form.Item label="每页评论数" name="pageSize" initialValue={comment.pageSize} rules={[{required: true}]}><InputNumber min={1} max={100} /></Form.Item>
                                    <Form.Item label="界面语言" name="locale" initialValue={comment.locale}><Select options={[{value: 'zh-CN', label: '简体中文'}, {value: 'en-US', label: 'English'}]} /></Form.Item>
                                    <Form.Item label="同 IP 评论间隔（秒）" name="ipQps" initialValue={comment.ipQps}><InputNumber min={1} max={3600} /></Form.Item>
                                </div>
                            :
                                this.isCommentTypeSite() ?
                                    <div className="comment-content">
                                        <label>网站名称（<a onClick={() => this.openDialog()}>有疑问</a>）</label>
                                        <Form.Item
                                            name="site"
                                            rules={[
                                                {required: true, message: '请填写在评论服务里的网站名称'}
                                            ]}
                                            initialValue={comment.name || ''}
                                        >
                                            <Input placeholder="请填写网站名称" />
                                        </Form.Item>
                                    </div>
                                :
                                    <div className="comment-content">
                                        <label>评论代码（<a onClick={() => this.openDialog()}>有疑问</a>）</label>
                                        <Form.Item
                                            name="code"
                                            rules={[
                                                {required: true, message: '请填写评论代码'}
                                            ]}
                                            initialValue={comment.name || ''}
                                        >
                                            <TextArea placeholder="请填写评论代码" style={{height: 240}} />
                                        </Form.Item>
                                    </div>
                            }
                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={submitting}>提交</Button>
                            </Form.Item>
                        </Form>
                    </div>
                </div>
            </>
        );
    }
}

export default CommentForm;
