import React from 'react';
import { Form, FormInstance, Input, Button } from 'antd';
import { inject, observer } from '@admin/utils/mobx-react';
import BreadCrumb from '../../../components/breadcrumb';
import { AnalysisProps } from './analysis.model';
const TextArea = Input.TextArea;
function AnalysisForm(props: AnalysisProps) {
    const [state, setState] = React.useState(() => ({
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
            props.analysisStore.analysisSave(values);
        };
    }
    legacy.render = function render() {
        const { submitting } = legacy.state;
        return (
            <>
                <BreadCrumb className="breadcrumb" {...props} />
                <div className="page-list">
                    <h3 className="page-title">网站统计代码</h3>
                    <div className="option-comment-page">
                        <Form
                            ref={legacy.formRef}
                            onFinish={legacy.handleSubmit}
                            scrollToFirstError
                        >
                            <Form.Item
                                name="analyze_code"
                                initialValue={
                                    window.SysConfig.options.analyze_code || ''
                                }
                                extra="直接贴入百度统计或者 Google 统计代码"
                            >
                                <TextArea style={{ height: 240 }} />
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

export default inject('analysisStore')(observer(AnalysisForm));
