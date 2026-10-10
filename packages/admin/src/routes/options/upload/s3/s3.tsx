import React from 'react';
import { Form } from 'antd';
import { Input } from 'antd';
import { OptionsUploadItemsProps } from '../upload.model';

class OptionsUploadS3FormItems extends React.Component<OptionsUploadItemsProps, {}> {

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
                        {required: true, message: '请填写 AWS S3 的accessKeyId'}
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
                        {required: true, message: '请填写 AWS S3 的accessKeySecret'}
                    ]}
                    initialValue={this.props.upload.accessKeySecret || ''}
                >
                    <Input />
                </Form.Item>
                {/* 存储桶(Bucket) */}
                <Form.Item
                    label="存储桶(Bucket)"
                    name="bucket"
                    rules={[
                        {required: true, message: '请填写 AWS S3 的存储桶名'}
                    ]}
                    initialValue={this.props.upload.bucket || ''}
                >
                    <Input />
                </Form.Item>
                {/* 服务区域/终端节点 */}
                <Form.Item
                    label="服务区域/终端节点"
                    name="region"
                    rules={[
                        {required: true, message: '请填写 S3 的服务区域或者终端节点'}
                    ]}
                    initialValue={this.props.upload.region || ''}
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

export default OptionsUploadS3FormItems;
