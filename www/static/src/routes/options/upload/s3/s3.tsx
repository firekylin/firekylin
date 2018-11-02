import React from 'react';
import { Form, Input } from 'antd';
const FormItem = Form.Item;
import { OptionsUploadItemsProps } from '../upload.model';

class OptionsUploadS3FormItems extends React.Component<OptionsUploadItemsProps, {}> {

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
                            {required: true, message: '请填写 AWS S3 的accessKeyId'}
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
                            {required: true, message: '请填写 AWS S3 的accessKeySecret'}
                        ],
                        initialValue: this.props.upload.accessKeySecret || '',
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
                            {required: true, message: '请填写 AWS S3 的存储桶名'}
                        ],
                        initialValue: this.props.upload.bucket || '',
                    })(
                        <Input />
                    )}
                </FormItem>
                {/* 服务区域/终端节点 */}
                <FormItem
                    label="服务区域/终端节点"
                >
                    {getFieldDecorator('region', {
                        rules: [
                            {required: true, message: '请填写 S3 的服务区域或者终端节点'}
                        ],
                        initialValue: this.props.upload.region || '',
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

export default OptionsUploadS3FormItems;
