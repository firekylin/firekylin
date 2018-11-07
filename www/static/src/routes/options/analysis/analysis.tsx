import React from 'react';
import { Form, Input, Button } from 'antd';
import { inject, observer } from 'mobx-react';
import BreadCrumb from '../../../components/breadcrumb';
import { AnalysisProps } from './analysis.model';
const FormItem = Form.Item;
const TextArea = Input.TextArea;

@inject('analysisStore')
@observer
class AnalysisForm extends React.Component<AnalysisProps> {
    state = {
        submitting: false,
    };

    constructor(props: AnalysisProps) {
        super(props);
    }

    handleSubmit = (e: React.FormEvent<any>) => {
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                this.props.analysisStore.analysisSave(values);
            }
        });
    }
    
    render() {
        const { getFieldDecorator } = this.props.form;
        const { submitting } = this.state;
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="page-list">
                    <h3 className="page-title">网站统计代码</h3>
                    <div className="option-comment-page">
                        <Form onSubmit={this.handleSubmit}>
                            <FormItem
                                extra="直接贴入百度统计或者 Google 统计代码"
                            >
                                {getFieldDecorator('analyze_code', {
                                    initialValue: window.SysConfig.options.analyze_code || '',
                                })(
                                    <TextArea style={{height: 240}} />
                                )}
                            </FormItem>
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
const Analysis = Form.create()(AnalysisForm);
export default Analysis;
