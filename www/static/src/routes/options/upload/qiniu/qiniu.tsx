import React from 'react';
import { Form } from 'antd';
import { Input } from 'antd';
import { OptionsUploadItemsProps } from '../upload.model';

class OptionsUploadQiNiuFormItems extends React.Component<OptionsUploadItemsProps, {}> {

    constructor(props: OptionsUploadItemsProps) {
        super(props);
    }

    render() {
        return (
            <>
                {/* AccessKey */}
                <Form.Item
                    label="AccessKey"
                    name="accessKey"
                    rules={[
                        {required: true, message: '请填写七牛云的accessKey'}
                    ]}
                    initialValue={this.props.upload.accessKey || ''}
                >
                    <Input />
                </Form.Item>
                {/* SecretKey */}
                <Form.Item
                    label="SecretKey"
                    name="secretKey"
                    rules={[
                        {required: true, message: '请填写七牛云的secretKey'}
                    ]}
                    initialValue={this.props.upload.secretKey || ''}
                >
                    <Input />
                </Form.Item>
                {/* 空间名(Bucket) */}
                <Form.Item
                    label="空间名(Bucket)"
                    name="bucket"
                    rules={[
                        {required: true, message: '请填写七牛云的空间名'}
                    ]}
                    initialValue={this.props.upload.bucket || ''}
                >
                    <Input />
                </Form.Item>
                {/* 七牛云域名 */}
                <Form.Item
                    label="七牛云域名"
                    name="origin"
                    rules={[
                        {required: true, message: '请填写七牛云的域名'}
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

export default OptionsUploadQiNiuFormItems;
