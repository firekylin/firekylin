import React from 'react';
import { Form } from 'antd';
import { Input } from 'antd';
import { OptionsUploadItemsProps } from '../upload.model';

class OptionsUploadAliYunFormItems extends React.Component<OptionsUploadItemsProps, {}> {

    constructor(props: OptionsUploadItemsProps) {
        super(props);
    }

    render() {
        return (
            <>
                {/* accessKeyId */}
                <Form.Item
                    label="accessKeyId"
                    name="accessKeyId"
                    rules={[
                        {required: true, message: '请填写阿里云的accessKeyId'}
                    ]}
                    initialValue={this.props.upload.accessKeyId || ''}
                >
                    <Input />
                </Form.Item>
                {/* accessKeySecret */}
                <Form.Item
                    label="accessKeySecret"
                    name="accessKeySecret"
                    rules={[
                        {required: true, message: '请填写阿里云的accessKeySecret'}
                    ]}
                    initialValue={this.props.upload.accessKeySecret || ''}
                >
                    <Input />
                </Form.Item>
                {/* 服务区域 */}
                <Form.Item
                    label="服务区域"
                    name="region"
                    rules={[
                        {required: true, message: '请填写OSS的服务区域'}
                    ]}
                    initialValue={this.props.upload.region || ''}
                >
                    <Input />
                </Form.Item>
                {/* 空间名(Bucket) */}
                <Form.Item
                    label="空间名(Bucket)"
                    name="bucket"
                    rules={[
                        {required: true, message: '请填写阿里云的空间名'}
                    ]}
                    initialValue={this.props.upload.bucket || ''}
                >
                    <Input />
                </Form.Item>
                {/* 阿里云域名 */}
                <Form.Item
                    label="阿里云域名"
                    name="origin"
                    rules={[
                        {required: true, message: '请填写阿里云的域名'}
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

export default OptionsUploadAliYunFormItems;
