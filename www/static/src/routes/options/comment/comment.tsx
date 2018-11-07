import React from 'react';
import { Form, Input, Button, Radio, Modal } from 'antd';
import { inject, observer } from 'mobx-react';
import BreadCrumb from '../../../components/breadcrumb';
import './comment.less';
import { CommentProps, CommentState } from './comment.model';
import { RadioChangeEvent } from 'antd/lib/radio';
const FormItem = Form.Item;
const RadioGroup = Radio.Group;
const TextArea = Input.TextArea;

@inject('commentStore')
@observer
class CommentForm extends React.Component<CommentProps, CommentState> {
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

    handleSubmit = (e: React.FormEvent<any>) => {
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                const params = {
                    name: this.isCommentTypeSite() ? values.site : values.code,
                    type: values.type
                };
                this.props.commentStore.commentSave(params);
            }
        });
    }

    // 评论类型是否是网站
    isCommentTypeSite() {
        return this.state.comment.type !== 'custom' && this.state.comment.type !== 'gitalk';
    }
    
    render() {
        const { getFieldDecorator } = this.props.form;
        const { comment, submitting } = this.state;
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="page-list">
                    <h3 className="page-title">评论设置</h3>
                    <div className="option-comment-page">
                        <Form onSubmit={this.handleSubmit}>
                            <FormItem
                                label="评论类型"
                            >
                                {getFieldDecorator('type', {
                                    initialValue: comment.type,
                                })(
                                    <RadioGroup
                                        onChange={e => this.handleChange(e)}
                                    >
                                        <Radio value="disqus">Disqus</Radio>
                                        <Radio value="hypercomments">HyperComments</Radio>
                                        <Radio value="changyan">畅言</Radio>
                                        <Radio value="gitalk">Gitalk</Radio>
                                        <Radio value="custom">自定义</Radio>
                                    </RadioGroup>
                                )}
                            </FormItem>
                            {
                                this.isCommentTypeSite() ?
                                    <div className="comment-content">
                                        <label>网站名称（<a onClick={() => this.openDialog()}>有疑问</a>）</label>
                                        <FormItem>
                                            {getFieldDecorator('site', {
                                                rules: [
                                                    {required: true, message: '请填写在评论服务里的网站名称'}
                                                ],
                                                initialValue: comment.name || '',
                                            })(
                                                <Input placeholder="请填写网站名称" />
                                            )}
                                        </FormItem>
                                    </div>
                                :
                                    <div className="comment-content">
                                        <label>评论代码（<a onClick={() => this.openDialog()}>有疑问</a>）</label>
                                        <FormItem>
                                            {getFieldDecorator('code', {
                                                rules: [
                                                    {required: true, message: '请填写评论代码'}
                                                ],
                                                initialValue: comment.name || '',
                                            })(
                                                <TextArea placeholder="请填写评论代码" style={{height: 240}} />
                                            )}
                                        </FormItem>
                                    </div>
                            }
                            <FormItem>
                                <Button type="primary" htmlType="submit" loading={submitting}>提交</Button>
                            </FormItem>
                        </Form>
                    </div>
                </div>
            </>
        );
    }
}
const Comment = Form.create()(CommentForm);
export default Comment;
