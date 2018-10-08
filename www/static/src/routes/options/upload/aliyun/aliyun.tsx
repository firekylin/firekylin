import React from 'react';
import { Form, Input } from 'antd';
const FormItem = Form.Item;
import { OptionsUploadItemsProps } from '../upload.model';

class OptionsUploadAliYunFormItems extends React.Component<OptionsUploadItemsProps, {}> {

    constructor(props: OptionsUploadItemsProps) {
        super(props);
    }
    
    render() {
        const { getFieldDecorator } = this.props.form;
        return (
            <>
                {/* accessKeyId */}
                <FormItem
                    label="accessKeyId"
                >
                    {getFieldDecorator('accessKeyId', {
                        rules: [
                            {required: true, message: '请填写阿里云的accessKeyId'}
                        ],
                        initialValue: this.props.upload.accessKeyId || '',
                    })(
                        <Input />
                    )}
                </FormItem>
                {/* accessKeySecret */}
                <FormItem
                    label="accessKeySecret"
                >
                    {getFieldDecorator('accessKeySecret', {
                        rules: [
                            {required: true, message: '请填写阿里云的accessKeySecret'}
                        ],
                        initialValue: this.props.upload.accessKeySecret || '',
                    })(
                        <Input />
                    )}
                </FormItem>
                {/* 服务区域 */}
                <FormItem
                    label="服务区域"
                >
                    {getFieldDecorator('region', {
                        rules: [
                            {required: true, message: '请填写OSS的服务区域'}
                        ],
                        initialValue: this.props.upload.region || '',
                    })(
                        <Input />
                    )}
                </FormItem>
                {/* 空间名(Bucket) */}
                <FormItem
                    label="空间名(Bucket)"
                >
                    {getFieldDecorator('bucket', {
                        rules: [
                            {required: true, message: '请填写阿里云的空间名'}
                        ],
                        initialValue: this.props.upload.bucket || '',
                    })(
                        <Input />
                    )}
                </FormItem>
                {/* 阿里云域名 */}
                <FormItem
                    label="阿里云域名"
                >
                    {getFieldDecorator('origin', {
                        rules: [
                            {required: true, message: '请填写阿里云的域名'}
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

export default OptionsUploadAliYunFormItems;
