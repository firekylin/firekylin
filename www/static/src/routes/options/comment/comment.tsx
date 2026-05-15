import React from 'react';
import { Form, FormInstance } from 'antd';
import { Input, Button, Radio, Modal } from 'antd';
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
        },
        submitting: false,
    };
    constructor(props: CommentProps) {
        super(props);
        let comment = window.SysConfig.options.comment;
        if (typeof comment === 'string') {
            comment = JSON.parse(comment);
        }
        if (comment.name === 'undefined') {
            comment.name = '';
        }
        comment.name = unescape(comment.name);
        this.state = {
            submitting: false,
            comment: comment
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
        this.setState({comment: Object.assign({}, this.state.comment, {type: e.target.value})});
    }

    handleSubmit = (values: any) => {
        const params = {
            name: this.isCommentTypeSite() ? values.site : values.code,
            type: values.type
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
                        <Form ref={this.formRef} onFinish={this.handleSubmit} scrollToFirstError>
                            <Form.Item
                                label="评论类型"
                                name="type"
                                initialValue={comment.type}
                            >
                                <RadioGroup
                                    onChange={e => this.handleChange(e)}
                                >
                                    <Radio value="waline">Waline（<a href="https://waline.js.org" target="_blank">官网</a>）</Radio>
                                    <Radio value="valine">Valine</Radio>
                                    <Radio value="disqus">Disqus</Radio>
                                    <Radio value="hypercomments">HyperComments</Radio>
                                    <Radio value="changyan">畅言</Radio>
                                    <Radio value="gitalk">Gitalk</Radio>
                                    <Radio value="custom">自定义</Radio>
                                </RadioGroup>
                            </Form.Item>
                            {
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
