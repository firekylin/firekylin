import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { PushProps } from '../push.model';
import BreadCrumb from '../../../components/breadcrumb';
import { Form, FormInstance } from 'antd';
import { message, Input } from 'antd';

@inject('pushStore')
@observer
class PushCreateForm extends React.Component<PushProps,any> {
    formRef = React.createRef<FormInstance>();

    pushStore;
    id;

    constructor(props: PushProps) {
        super(props);
        this.pushStore = this.props.pushStore;
        this.id = this.props.match.params.id;
    }

    resetPushCreateParams() {
        this.pushStore.setPushCreateParam({
            submitting: false,
            pushInfo: {
                appKey : '',
                appSecret : '',
                title : '',
                url : '',
            }
        });
    }

    componentDidMount() {
        if (this.id) {
            this.pushStore.getPushInfo(this.id);
        } else {
            this.resetPushCreateParams();
        }
    }

    componentDidUpdate(prevProps: any) {
        if (prevProps.match.params.id !== this.props.match.params.id) {
            this.id = this.props.match.params.id;
            if (this.id) {
                this.pushStore.getPushInfo(this.id);
            } else {
                this.resetPushCreateParams();
            }
            return;
        }
        const { pushInfo } = this.pushStore.pushCreateParam;
        this.formRef.current?.setFieldsValue({
            title: pushInfo.title,
            url: pushInfo.url,
            appKey: pushInfo.appKey,
            appSecret: pushInfo.appSecret,
        });
    }

    /**
     * save
     * @return {}       []
     */
    handleValidSubmit = (values: any) => {
        this.pushStore.setPushCreateParam({submitting: true});
        if (this.id) {
            values.id = this.id;
        }
        this.pushStore.savePush(values).then(() => {
            setTimeout(() => this.props.history.push('/push/list'), 1000);
        });
    }

    /**
     * render
     * @return {} []
     */
    render() {
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
                    offset: 1,
                }
            },
        };
        let props = {};
        if (this.pushStore.pushCreateParam.submitting) {
            props.disabled = true;
        }

        return (
            <div className="fk-content-wrap">
                <BreadCrumb {...this.props} />
                <div className="manage-container">
                    <Form
                        ref={this.formRef}
                        className="tag-create clearfix"
                        onFinish={this.handleValidSubmit}
                        scrollToFirstError
                    >
                        <div className="alert alert-info" role="alert" style={{maxWidth: '700px'}}>
                            推送功能是指在本系统写博客时可以将文章推送到其他也使用 Firekylin 构建的博客系统中。
                            最明显的需求就是个人写博客时需要将文章推送到团队博客中。如果每次都是写完后把内容拷贝到团队博客中势必非常麻烦，
                            使用推送功能就非常简单了。
                        </div>
                        <Form.Item label="网站名称" {...formItemLayout}
                            name="title"
                            rules={[{
                                    required: true,
                                    message: '请填写网站名称!'
                                }]}
                        >
                            <Input placeholder="请填写网站名称" />
                        </Form.Item>
                        <Form.Item label="网站地址" {...formItemLayout}
                            name="url"
                            rules={[{
                                required: true,
                                message: '请填写网站地址!'
                            }]}
                        >
                            <Input placeholder="请填写网站地址" />
                        </Form.Item>
                        <Form.Item label="推送公钥" {...formItemLayout}
                            name="appKey"
                            rules={[{
                                required: true,
                                message: '请填写推送公钥!'
                            }]}
                        >
                            <Input placeholder="请填写推送公钥" />
                        </Form.Item>
                        <Form.Item label="推送秘钥" {...formItemLayout}
                            name="appSecret"
                            rules={[{
                                required: true,
                                message: '请填写推送秘钥!'
                            }]}
                        >
                            <Input placeholder="请填写推送秘钥" />
                        </Form.Item>
                        <Form.Item  {...tailFormItemLayout}>
                            <button type="submit" {...props} className="btn btn-primary">
                                {this.pushStore.pushCreateParam.submitting ? '提交中...' : '提交'}
                            </button>
                        </Form.Item>
                </Form>
                </div>
            </div>
    );
    }
}
export default PushCreateForm;
