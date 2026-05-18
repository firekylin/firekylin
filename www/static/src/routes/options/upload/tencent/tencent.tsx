import React from 'react';
import { Form } from 'antd';
import { Input } from 'antd';
import { OptionsUploadItemsProps } from '../upload.model';

class OptionsUploadTencentFormItems extends React.Component<OptionsUploadItemsProps, {}> {

    constructor(props: OptionsUploadItemsProps) {
        super(props);
    }

    render() {
        return (
            <>
                {/* SecretId */}
                <Form.Item
                    label="SecretId"
                    name="secretId"
                    rules={[
                        {required: true, message: '请填写腾讯云的SecretId'}
                    ]}
                    initialValue={this.props.upload.secretId || ''}
                >
                    <Input />
                </Form.Item>
                {/* SecretKey */}
                <Form.Item
                    label="SecretKey"
                    name="secretKey"
                    rules={[
                        {required: true, message: '请填写腾讯云的SecretKeyt'}
                    ]}
                    initialValue={this.props.upload.secretKey || ''}
                >
                    <Input />
                </Form.Item>
                {/* 存储桶(Bucket) */}
                <Form.Item
                    label="存储桶(Bucket)"
                    name="bucket"
                    rules={[
                        {required: true, message: '请填写腾讯云的存储桶名称'}
                    ]}
                    initialValue={this.props.upload.bucket || ''}
                >
                    <Input />
                </Form.Item>
                {/* 所属地域 */}
                <Form.Item
                    label="所属地域"
                    name="region"
                    rules={[
                        {required: true, message: '请填写腾讯云存储桶的所属地域'}
                    ]}
                    initialValue={this.props.upload.region || ''}
                >
                    <Input />
                </Form.Item>
                {/* 访问域名 */}
                <Form.Item
                    label="访问域名"
                    name="origin"
                    rules={[
                        {required: true, message: '请填写腾讯云存储桶的访问域名'}
                    ]}
                    initialValue={this.props.upload.origin || ''}
                >
                    <Input />
                </Form.Item>
                {/* 路径前缀 */}
                <Form.Item
                    label="路径前缀"
                    name="prefix"
                    initialValue={this.props.upload.prefix || ''}
                >
                    <Input />
                </Form.Item>
            </>
        );
    }
}

export default OptionsUploadTencentFormItems;
