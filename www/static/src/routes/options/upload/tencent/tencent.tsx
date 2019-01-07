import React from 'react';
import { Form, Input } from 'antd';
const FormItem = Form.Item;
import { OptionsUploadItemsProps } from '../upload.model';

class OptionsUploadTencentFormItems extends React.Component<OptionsUploadItemsProps, {}> {

    constructor(props: OptionsUploadItemsProps) {
        super(props);
    }
    
    render() {
        const { getFieldDecorator } = this.props.form;
        return (
            <>
                {/* SecretId */}
                <FormItem
                    label="SecretId"
                >
                    {getFieldDecorator('secretId', {
                        rules: [
                            {required: true, message: '请填写腾讯云的SecretId'}
                        ],
                        initialValue: this.props.upload.secretId || '',
                    })(
                        <Input />
                    )}
                </FormItem>
                {/* SecretKey */}
                <FormItem
                    label="SecretKey"
                >
                    {getFieldDecorator('secretKey', {
                        rules: [
                            {required: true, message: '请填写腾讯云的SecretKeyt'}
                        ],
                        initialValue: this.props.upload.secretKey || '',
                    })(
                        <Input />
                    )}
                </FormItem>
                {/* 存储桶(Bucket) */}
                <FormItem
                    label="存储桶(Bucket)"
                >
                    {getFieldDecorator('bucket', {
                        rules: [
                            {required: true, message: '请填写腾讯云的存储桶名称'}
                        ],
                        initialValue: this.props.upload.bucket || '',
                    })(
                        <Input />
                    )}
                </FormItem>
                {/* 所属地域 */}
                <FormItem
                    label="所属地域"
                >
                    {getFieldDecorator('region', {
                        rules: [
                            {required: true, message: '请填写腾讯云存储桶的所属地域'}
                        ],
                        initialValue: this.props.upload.region || '',
                    })(
                        <Input />
                    )}
                </FormItem>
                {/* 访问域名 */}
                <FormItem
                    label="访问域名"
                >
                    {getFieldDecorator('origin', {
                        rules: [
                            {required: true, message: '请填写腾讯云存储桶的访问域名'}
                        ],
                        initialValue: this.props.upload.origin || '',
                    })(
                        <Input />
                    )}
                </FormItem>
                {/* 路径前缀 */}
                <FormItem
                    label="路径前缀"
                >
                    {getFieldDecorator('prefix', {
                        initialValue: this.props.upload.prefix || '',
                    })(
                        <Input />
                    )}
                </FormItem>
            </>
        );
    }
}

export default OptionsUploadTencentFormItems;
