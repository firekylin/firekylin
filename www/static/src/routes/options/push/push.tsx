import React from 'react';
import { Form, Button, Radio } from 'antd';
import { inject, observer } from 'mobx-react';
import BreadCrumb from '../../../components/breadcrumb';
import { OptionsPushProps } from './push.model';
import RadioGroup from 'antd/lib/radio/group';
const FormItem = Form.Item;

@inject('optionsPushStore')
@observer
class PushForm extends React.Component<OptionsPushProps> {
    state = {
        options: window.SysConfig.options,
        submitting: false,
    };

    constructor(props: OptionsPushProps) {
        super(props);
    }

    handleSubmit = (e: React.FormEvent<any>) => {
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                // 
                this.props.optionsPushStore.pushSave(values);
            }
        });
    }
    
    render() {
        const { getFieldDecorator } = this.props.form;
        const { submitting } = this.state;
        const url = location.protocol + '//' + location.host + '/index/contributor';
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="page-list">
                    <h3 className="page-title">推送设置</h3>
                    <p>开启后他人可以通过 <a href={url} target="_blank">{url}</a> 申请成为投稿者。</p>
                    <div className="option-comment-page">
                        <Form onSubmit={this.handleSubmit}>
                            <FormItem>
                                {getFieldDecorator('push', {
                                    initialValue: this.state.options.push,
                                })(
                                    <RadioGroup>
                                        <Radio value="1">开启</Radio>
                                        <Radio value="0">关闭</Radio>
                                    </RadioGroup>
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
const OptionsPush = Form.create()(PushForm);
export default OptionsPush;
