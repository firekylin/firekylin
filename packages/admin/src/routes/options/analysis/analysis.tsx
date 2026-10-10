import React from 'react';
import { Form, FormInstance, Input, Button } from 'antd';
import { inject, observer } from 'mobx-react';
import BreadCrumb from '../../../components/breadcrumb';
import { AnalysisProps } from './analysis.model';
const TextArea = Input.TextArea;

@inject('analysisStore')
@observer
class AnalysisForm extends React.Component<AnalysisProps> {
    formRef = React.createRef<FormInstance>();

    state = {
        submitting: false,
    };

    handleSubmit = (values: any) => {
        this.props.analysisStore.analysisSave(values);
    }

    render() {
        const { submitting } = this.state;
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="page-list">
                    <h3 className="page-title">网站统计代码</h3>
                    <div className="option-comment-page">
                        <Form ref={this.formRef} onFinish={this.handleSubmit} scrollToFirstError>
                            <Form.Item
                                name="analyze_code"
                                initialValue={window.SysConfig.options.analyze_code || ''}
                                extra="直接贴入百度统计或者 Google 统计代码"
                            >
                                <TextArea style={{height: 240}} />
                            </Form.Item>
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
export default AnalysisForm;
