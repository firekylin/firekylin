import React from 'react';
import { Form, FormInstance } from 'antd';
import { Button, Radio } from 'antd';
import { inject, observer } from '@admin/utils/mobx-react';
import BreadCrumb from '../../../components/breadcrumb';
import { OptionsPushProps } from './push.model';
const RadioGroup = Radio.Group;
function PushForm(props: OptionsPushProps) {
    const [state, setState] = React.useState(() => ({
        options: window.SysConfig.options,
        submitting: false,
    }));
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
        legacy.handleSubmit = (values: any) => {
            props.optionsPushStore.pushSave(values);
        };
    }
    legacy.render = function render() {
        const { submitting } = legacy.state;
        const url = location.protocol + '//' + location.host + '/index/contributor';
        return (
            <>
                <BreadCrumb className="breadcrumb" {...props} />
                <div className="page-list">
                    <h3 className="page-title">推送设置</h3>
                    <p>
                        开启后他人可以通过{' '}
                        <a href={url} target="_blank">
                            {url}
                        </a>{' '}
                        申请成为投稿者。
                    </p>
                    <div className="option-comment-page">
                        <Form
                            ref={legacy.formRef}
                            onFinish={legacy.handleSubmit}
                            layout="vertical"
                            scrollToFirstError
                        >
                            <Form.Item
                                name="push"
                                initialValue={legacy.state.options.push}
                            >
                                <RadioGroup>
                                    <Radio value="1">开启</Radio>
                                    <Radio value="0">关闭</Radio>
                                </RadioGroup>
                            </Form.Item>
                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={submitting}
                                >
                                    提交
                                </Button>
                            </Form.Item>
                        </Form>
                    </div>
                </div>
            </>
        );
    };
    return legacy.render();
}

export default inject('optionsPushStore')(observer(PushForm));
