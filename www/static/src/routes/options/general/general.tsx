import * as React from 'react';
import BreadCrumb from '../../../components/breadcrumb';
import { Form, FormInstance } from 'antd';
import { Input, Button, Upload, message } from 'antd';
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons';
import { inject, observer } from 'mobx-react';
import { GeneralProps } from './general.model';
import { UploadChangeParam } from 'antd';
import './general.less';

@inject('generalStore')
@observer
class GeneralForm extends React.Component<GeneralProps, {}> {
    formRef = React.createRef<FormInstance>();

    constructor(props: GeneralProps) {
        super(props);
    }

    componentDidMount() {
        //
    }

    handleSubmit = (values: any) => {
        this.props.generalStore.submit(values);
    }

    handleChange = (info: UploadChangeParam, type: 'logo' | 'favicon') => {
        if (info.file.status === 'uploading') {
          this.setState({ loading: true });
          return;
        }
        if (info.file.status === 'done') {
          this.setState({loading: false});
          this.handleFile(info, type);
        }
    }

    getBase64(img: any, callback: Function) {
        const reader = new FileReader();
        reader.addEventListener('load', () => callback(reader.result));
        reader.readAsDataURL(img);
    }

    handleFile(fileInfo: UploadChangeParam, type: 'logo' | 'favicon') {
        if (fileInfo.file.response.errno !== 0) {
            message.error(fileInfo.file.response.errmsg);
        } else {
            const url = fileInfo.file.response.data;
            if (type === 'logo') {
                this.formRef.current?.setFieldsValue({
                    logo_url: url
                });
                window.SysConfig.options.logo_url = url;
                this.props.generalStore.setData({options: window.SysConfig.options});
            } else {
                this.formRef.current?.setFieldsValue({
                    favicon_url: url
                });
                window.SysConfig.options.favicon_url = url;
                this.props.generalStore.setData({options: window.SysConfig.options});
            }
        }
    }

    beforeUpload(file: File) {
        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('图片必须小于5MB!');
        }
        return isLt5M;
    }

    render() {
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

        const { options } = window.SysConfig;
        const { loading } = this.props.generalStore;
        const { logo_url, favicon_url } = options;
        let [logoUrl, iconUrl] = [logo_url, favicon_url];
        if (logoUrl && !logoUrl.includes('data:image')) {
            logoUrl += (logoUrl.includes('?') ? '&' : '?') + 'm=' + Date.now();
        }
        if (iconUrl) {
            iconUrl += (iconUrl.includes('?') ? '&' : '?') + 'm=' + Date.now();
        }
        const uploadButton = (
            <div>
              {this.props.generalStore.loading.logo ? <LoadingOutlined /> : <PlusOutlined />}
              <div className="ant-upload-text">Upload</div>
            </div>
        );

        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="options-general-page page-list">
                    <h3 className="page-title">基本设置</h3>
                    <Form ref={this.formRef} onFinish={this.handleSubmit} scrollToFirstError>
                        <Form.Item
                            {...formItemLayout}
                            label="站点名称"
                            name="title"
                            rules={[{
                                required: true, message: '请填写站点名称',
                            }]}
                            initialValue={options.title}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            {...formItemLayout}
                            label="LOGO 地址"
                        >
                            <Upload
                                name="file"
                                listType="picture-card"
                                accept=""
                                className="avatar-uploader"
                                showUploadList={false}
                                style={{width: 140, height: 140}}
                                action="/admin/api/file"
                                beforeUpload={this.beforeUpload}
                                onChange={e => this.handleChange(e, 'logo')}
                            >
                                {logoUrl ? <img src={logo_url} alt="avatar" /> : uploadButton}
                            </Upload>
                            <Form.Item
                                name="logo_url"
                                initialValue={logo_url}
                                noStyle
                            >
                                <Input onChange={e => {
                                    window.SysConfig.options.logo_url = e.target.value;
                                    this.props.generalStore.setData({options: window.SysConfig.options});
                                }} />
                            </Form.Item>
                            <p>尺寸最好为 140x140px。</p>
                        </Form.Item>
                        <Form.Item
                            {...formItemLayout}
                            label="站点描述"
                            name="description"
                            rules={[{
                                required: true, message: '请填写站点描述',
                            }]}
                            initialValue={options.description}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            {...formItemLayout}
                            label="网站地址"
                            name="site_url"
                            initialValue={options.site_url}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            {...formItemLayout}
                            label="Favicon 地址"
                        >
                            <Upload
                                name="file"
                                listType="picture-card"
                                accept=".ico"
                                className="avatar-uploader"
                                showUploadList={false}
                                style={{width: 140, height: 140}}
                                action="/admin/api/file"
                                beforeUpload={this.beforeUpload}
                                onChange={e => this.handleChange(e, 'favicon')}
                            >
                                {iconUrl ? <img src={favicon_url} alt="avatar" /> : uploadButton}
                            </Upload>
                            <Form.Item
                                name="favicon_url"
                                initialValue={favicon_url}
                                noStyle
                            >
                                <Input onChange={e => {
                                    window.SysConfig.options.favicon_url = e.target.value;
                                    this.props.generalStore.setData({options: window.SysConfig.options});
                                }} />
                            </Form.Item>
                            <p>尺寸最好为 128x128px。</p>
                        </Form.Item>
                        <Form.Item
                            {...formItemLayout}
                            label="关键词"
                            name="keywords"
                            initialValue={options.keywords}
                        >
                            <Input />
                        </Form.Item>
                        <p>请以半角逗号 "," 分割多个关键字.</p>
                        <Form.Item
                            {...formItemLayout}
                            label="GitHub 地址"
                            name="github_url"
                            initialValue={options.github_url}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            {...formItemLayout}
                            label="Twitter 地址"
                            name="twitter_url"
                            initialValue={options.twitter_url}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            {...formItemLayout}
                            label="网站工信部备案号"
                            name="miitbeian"
                            initialValue={options.miitbeian}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            {...formItemLayout}
                            label="网站公安部备案号"
                            name="mpsbeian"
                            initialValue={options.mpsbeian}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item {...tailFormItemLayout}>
                            <Button type="primary" htmlType="submit" loading={loading.submit}>提交</Button>
                        </Form.Item>
                    </Form>
                </div>
            </>
        );
    }
}
export default GeneralForm;
