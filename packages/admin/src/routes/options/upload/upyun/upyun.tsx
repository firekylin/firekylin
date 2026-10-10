import React from 'react';
import { Form } from 'antd';
import { Input } from 'antd';
import { OptionsUploadItemsProps } from '../upload.model';

class OptionsUploadUpYunFormItems extends React.Component<OptionsUploadItemsProps, {}> {

    constructor(props: OptionsUploadItemsProps) {
        super(props);
    }

    render() {
        return (
            <>
                {/* 操作员 */}
                <Form.Item
                    label="操作员"
                    name="operater"
                    rules={[
                        {required: true, message: '请填写又拍云的操作员'}
                    ]}
                    initialValue={this.props.upload.operater || ''}
                >
                    <Input />
                </Form.Item>
                {/* 操作员密码 */}
                <Form.Item
                    label="SecretKey"
                    name="操作员密码"
                    rules={[
                        {required: true, message: '请填写又拍云的操作员密码'}
                    ]}
                    initialValue={this.props.upload.password || ''}
                >
                    <Input />
                </Form.Item>
                {/* 空间名(Bucket) */}
                <Form.Item
                    label="空间名(Bucket)"
                    name="upyunBucket"
                    rules={[
                        {required: true, message: '请填写又拍云的服务名'}
                    ]}
                    initialValue={this.props.upload.upyunBucket || ''}
                >
                    <Input />
                </Form.Item>
                {/* 又拍云域名 */}
                <Form.Item
                    label="又拍云域名"
                    name="upyunOrigin"
                    rules={[
                        {required: true, message: '请填写又拍云的域名'}
                    ]}
                    initialValue={this.props.upload.upyunOrigin || ''}
                >
                    <Input />
                </Form.Item>
                {/* 路径前缀 */}
                <Form.Item
                    label="路径前缀"
                    name="upyunPrefix"
                    initialValue={this.props.upload.upyunPrefix || ''}
                >
                    <Input />
                </Form.Item>
            </>
        );
    }
}

export default OptionsUploadUpYunFormItems;
