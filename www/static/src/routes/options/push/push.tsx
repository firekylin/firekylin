import React from 'react';
import { Form, FormInstance } from 'antd';
import { Button, Radio } from 'antd';
import { inject, observer } from 'mobx-react';
import BreadCrumb from '../../../components/breadcrumb';
import { OptionsPushProps } from './push.model';
const RadioGroup = Radio.Group;

@inject('optionsPushStore')
@observer
class PushForm extends React.Component<OptionsPushProps> {
    formRef = React.createRef<FormInstance>();

    state = {
        options: window.SysConfig.options,
        submitting: false,
    };

    handleSubmit = (values: any) => {
        this.props.optionsPushStore.pushSave(values);
    }

    render() {
        const { submitting } = this.state;
        const url = location.protocol + '//' + location.host + '/index/contributor';
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="page-list">
                    <h3 className="page-title">推送设置</h3>
                    <p>开启后他人可以通过 <a href={url} target="_blank">{url}</a> 申请成为投稿者。</p>
                    <div className="option-comment-page">
                        <Form ref={this.formRef} onFinish={this.handleSubmit} scrollToFirstError>
                            <Form.Item name="push" initialValue={this.state.options.push}>
                                <RadioGroup>
                                    <Radio value="1">开启</Radio>
                                    <Radio value="0">关闭</Radio>
                                </RadioGroup>
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
export default PushForm;
