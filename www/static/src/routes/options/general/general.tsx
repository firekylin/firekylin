import * as React from 'react';
import BreadCrumb from '../../../components/breadcrumb';
import { Form, Input, Button, Select } from 'antd';
import { inject, observer } from 'mobx-react';
import { GeneralProps } from './general.model';
const FormItem = Form.Item;
const Option = Select.Option;

@inject('generalStore')
@observer
class GeneralForm extends React.Component<GeneralProps, {}> {

    constructor(props: GeneralProps) {
        super(props);
    }

    componentDidMount() {
        // 
    }

    handleSubmit = (e: React.FormEvent<any>) => {
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                // 
            }
        });
    }
    
    render() {
        const { getFieldDecorator } = this.props.form;
        const formItemLayout = {
            labelCol: {
                xl: { span: 24 },
                sm: { span: 24 },
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
                offset: 0,
              }
            },
        };

        const { options } = this.props.generalStore.data;
        const { logo_url, favicon_url } = options;
        let [logoUrl, iconUrl] = [logo_url, favicon_url];
        if (logoUrl && !logoUrl.includes('data:image')) {
            logoUrl += (logoUrl.includes('?') ? '&' : '?') + 'm=' + Date.now();
        }
        if (iconUrl) {
            iconUrl += (iconUrl.includes('?') ? '&' : '?') + 'm=' + Date.now();
        }
        
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="options-general-page page-list">
                    <h3 className="page-title">基本设置</h3>
                    <Form onSubmit={this.handleSubmit}>
                        <FormItem
                            {...formItemLayout}
                            label="站点名称"
                        >
                            {getFieldDecorator('title', {
                                rules: [{
                                    required: true, message: '请填写站点名称',
                                }],
                                initialValue: options.title,
                            })(
                                <Input />
                            )}
                        </FormItem>
                        <FormItem
                            {...formItemLayout}
                            label="LOGO 地址"
                        >
                            {getFieldDecorator('title', {
                                initialValue: logoUrl,
                            })(
                                
                                <div>
                                    {
                                        logoUrl 
                                        ?
                                            <img 
                                                src={logoUrl} 
                                                width="140px" 
                                                height="140px" 
                                                alt="logo"
                                                style={{display: 'block', marginBottom: '10px'}}
                                            /> 
                                        :  
                                            null
                                    }
                                    <Input value={options.logo_url} />
                                    <p>尺寸最好为 140x140px。</p>
                                </div>
                            )}
                        </FormItem>
                        <FormItem
                            {...formItemLayout}
                            label="站点描述"
                        >
                            {getFieldDecorator('pathname', {
                                rules: [{
                                    required: true, message: '请填写站点描述',
                                }],
                                initialValue: options.description
                            })(
                                <Input />
                            )}
                        </FormItem>
                        <FormItem
                            {...formItemLayout}
                            label="网站地址"
                        >
                            {getFieldDecorator('site_url', {
                                initialValue: options.site_url
                            })(
                                <Input />
                            )}
                        </FormItem>
                        <FormItem
                            {...formItemLayout}
                            label="Favicon 地址"
                        >
                            {getFieldDecorator('favicon_url', {
                                initialValue: ''
                            })(
                                <Input />
                            )}
                        </FormItem>
                        <p>尺寸最好为 128x128px。</p>
                        <FormItem
                            {...formItemLayout}
                            label="关键词"
                        >
                            {getFieldDecorator('keywords', {
                                initialValue: ''
                            })(
                                <Input />
                            )}
                        </FormItem>
                        <p>请以半角逗号 "," 分割多个关键字.</p>
                        <FormItem
                            {...formItemLayout}
                            label="GitHub 地址"
                        >
                            {getFieldDecorator('github_url', {
                                initialValue: ''
                            })(
                                <Input />
                            )}
                        </FormItem>
                        <FormItem
                            {...formItemLayout}
                            label="Twitter 地址"
                        >
                            {getFieldDecorator('twitter_url', {
                                initialValue: ''
                            })(
                                <Input />
                            )}
                        </FormItem>
                        <FormItem
                            {...formItemLayout}
                            label="网站工信部备案号"
                        >
                            {getFieldDecorator('miitbeian', {
                                initialValue: ''
                            })(
                                <Input />
                            )}
                        </FormItem>
                        <FormItem
                            {...formItemLayout}
                            label="网站公安部备案号"
                        >
                            {getFieldDecorator('mpsbeian', {
                                initialValue: ''
                            })(
                                <Input />
                            )}
                        </FormItem>
                        <FormItem {...tailFormItemLayout}>
                            <Button type="primary" htmlType="submit">提交</Button>
                        </FormItem>
                    </Form>
                </div>
            </>
        );
    }
}
const General = Form.create()(GeneralForm);
export default General;
