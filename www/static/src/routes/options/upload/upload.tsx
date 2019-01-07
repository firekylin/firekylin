import React from 'react';
import { Form, Button, Radio } from 'antd';
import { inject, observer } from 'mobx-react';
import { OptionsUploadProps } from './upload.model';
import { UploadEnum } from './upload.enum';
import BreadCrumb from '../../../components/breadcrumb';
import RadioGroup from 'antd/lib/radio/group';
import OptionsUploadQiNiuFormItems from './qiniu/qiniu';
import './upload.less';
import OptionsUploadUpYunFormItems from './upyun/upyun';
import OptionsUploadAliYunFormItems from './aliyun/aliyun';
import OptionsUploadS3FormItems from './s3/s3';
import OptionsUploadTencentFormItems from './tencent/tencent';
const FormItem = Form.Item;

@inject('optionsUploadStore')
@observer
class OptionsUploadForm extends React.Component<OptionsUploadProps, {}> {

    constructor(props: OptionsUploadProps) {
        super(props);
        let upload = window.SysConfig.options.upload;
        if (typeof upload === 'string') {
            upload = JSON.parse(upload);
        }
        props.optionsUploadStore.setUpload(upload);
    }

    renderUploadItems() {
        const { upload } = this.props.optionsUploadStore;
        const type: UploadEnum = upload.type;
        switch (type) {
            case UploadEnum.QiNiu:
                return <OptionsUploadQiNiuFormItems upload={upload} form={this.props.form} />;
            case UploadEnum.Upyun:
                return <OptionsUploadUpYunFormItems upload={upload} form={this.props.form} />;
            case UploadEnum.AliYun:
                return <OptionsUploadAliYunFormItems upload={upload} form={this.props.form} />;
            case UploadEnum.SMMS:
                return <p>选用此功能图片将上传至第三方图床 : <a href="https://sm.ms/" target="_blank">SM.MS 图床</a></p>;
            case UploadEnum.AWSS3:
                return <OptionsUploadS3FormItems upload={upload} form={this.props.form} />;
            case UploadEnum.Tencent:
                return <OptionsUploadTencentFormItems upload={upload} form={this.props.form} />;
            default:
                return null;
        }
    }

    handleSubmit = (e: React.FormEvent<any>) => {
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                this.props.optionsUploadStore.uploadSave(values);
            }
        });
    }
    
    render() {
        const { getFieldDecorator } = this.props.form;
        const { upload, setUpload } = this.props.optionsUploadStore;
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="page-list">
                    <h3 className="page-title">上传设置</h3>
                    <div className="option-upload-page">
                        <Form onSubmit={this.handleSubmit}>
                            <FormItem
                                label="图片上传至"
                            >
                                {getFieldDecorator('type', {
                                    initialValue: upload.type || UploadEnum.Local,
                                })(
                                    <RadioGroup
                                        onChange={e => {
                                            this.props.form.resetFields();
                                            setUpload({type: e.target.value});
                                        }}
                                    >
                                        <Radio value={UploadEnum.Local}>本地</Radio>
                                        <Radio value={UploadEnum.QiNiu}>七牛云</Radio>
                                        <Radio value={UploadEnum.Upyun}>又拍云</Radio>
                                        <Radio value={UploadEnum.AliYun}>阿里云</Radio>
                                        <Radio value={UploadEnum.SMMS}>SM.MS 图床</Radio>
                                        <Radio value={UploadEnum.AWSS3}>AWS S3</Radio>
                                        <Radio value={UploadEnum.Tencent}>腾讯云</Radio>
                                    </RadioGroup>
                                )}
                            </FormItem>
                            {
                                this.renderUploadItems()
                            }
                            <FormItem>
                                <Button type="primary" htmlType="submit">提交</Button>
                            </FormItem>
                        </Form>
                    </div>
                </div>
            </>
        );
    }
}
const OptionsUpload = Form.create()(OptionsUploadForm);
export default OptionsUpload;
