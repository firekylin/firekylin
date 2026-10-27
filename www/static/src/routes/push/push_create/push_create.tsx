import * as React from 'react';
import { observer, inject } from '@admin/utils/mobx-react';
import { PushProps } from '../push.model';
import BreadCrumb from '../../../components/breadcrumb';
import { Form, FormInstance } from 'antd';
import { message, Input } from 'antd';
function PushCreateForm(props: PushProps) {
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

        legacy.pushStore = props.pushStore;
        legacy.id = props.match.params.id;
        legacy.handleValidSubmit = (values: any) => {
            legacy.pushStore.setPushCreateParam({ submitting: true });
            if (legacy.id) {
                values.id = legacy.id;
            }
            legacy.pushStore.savePush(values).then(() => {
                setTimeout(() => props.history.push('/push/list'), 1000);
            });
        };
    }
    legacy.resetPushCreateParams = function resetPushCreateParams() {
        legacy.pushStore.setPushCreateParam({
            submitting: false,
            pushInfo: { appKey: '', appSecret: '', title: '', url: '' },
        });
    };
    legacy.onMount = function onMount() {
        if (legacy.id) {
            legacy.pushStore.getPushInfo(legacy.id);
        } else {
            legacy.resetPushCreateParams();
        }
    };
    legacy.afterUpdate = function afterUpdate(prevProps: any) {
        if (prevProps.match.params.id !== props.match.params.id) {
            legacy.id = props.match.params.id;
            legacy.formTouched = false;
            if (legacy.id) {
                legacy.pushStore.getPushInfo(legacy.id);
            } else {
                legacy.resetPushCreateParams();
            }
            return;
        }
        const form = legacy.formRef.current;
        // 只在用户还没开始编辑时回填，否则每次重渲染都会用 store 里的旧值
        // 覆盖用户已经在输入框里写的内容。
        if (!form || legacy.formTouched) return;
        const { pushInfo } = legacy.pushStore.pushCreateParam;
        form.setFieldsValue({
            title: pushInfo.title,
            url: pushInfo.url,
            appKey: pushInfo.appKey,
            appSecret: pushInfo.appSecret,
        });
        legacy.formTouched = true;
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
                    offset: 1,
                },
            },
        };
        const submitting = legacy.pushStore.pushCreateParam.submitting;

        return (
            <div className="fk-content-wrap">
                <BreadCrumb />
                <div className="manage-container">
                    <Form
                        ref={legacy.formRef}
                        className="tag-create clearfix"
                        onFinish={legacy.handleValidSubmit}
                        scrollToFirstError
                    >
                        <div
                            className="alert alert-info"
                            role="alert"
                            style={{ maxWidth: '700px' }}
                        >
                            推送功能是指在本系统写博客时可以将文章推送到其他也使用
                            Firekylin 构建的博客系统中。
                            最明显的需求就是个人写博客时需要将文章推送到团队博客中。如果每次都是写完后把内容拷贝到团队博客中势必非常麻烦，
                            使用推送功能就非常简单了。
                        </div>
                        <Form.Item
                            label="网站名称"
                            {...formItemLayout}
                            name="title"
                            rules={[
                                {
                                    required: true,
                                    message: '请填写网站名称!',
                                },
                            ]}
                        >
                            <Input placeholder="请填写网站名称" />
                        </Form.Item>
                        <Form.Item
                            label="网站地址"
                            {...formItemLayout}
                            name="url"
                            rules={[
                                {
                                    required: true,
                                    message: '请填写网站地址!',
                                },
                            ]}
                        >
                            <Input placeholder="请填写网站地址" />
                        </Form.Item>
                        <Form.Item
                            label="推送公钥"
                            {...formItemLayout}
                            name="appKey"
                            rules={[
                                {
                                    required: true,
                                    message: '请填写推送公钥!',
                                },
                            ]}
                        >
                            <Input placeholder="请填写推送公钥" />
                        </Form.Item>
                        <Form.Item
                            label="推送秘钥"
                            {...formItemLayout}
                            name="appSecret"
                            rules={[
                                {
                                    required: true,
                                    message: '请填写推送秘钥!',
                                },
                            ]}
                        >
                            <Input placeholder="请填写推送秘钥" />
                        </Form.Item>
                        <Form.Item {...tailFormItemLayout}>
                            <button type="submit" disabled={submitting} className="btn btn-primary">
                                {submitting ? '提交中...' : '提交'}
                            </button>
                        </Form.Item>
                    </Form>
                </div>
            </div>
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

export default inject('pushStore')(observer(PushCreateForm));
