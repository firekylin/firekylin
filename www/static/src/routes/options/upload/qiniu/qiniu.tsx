import React from 'react';
import { Form, Input } from 'antd';
const FormItem = Form.Item;
import { OptionsUploadItemsProps } from '../upload.model';

class OptionsUploadQiNiuFormItems extends React.Component<OptionsUploadItemsProps, {}> {

    constructor(props: OptionsUploadItemsProps) {
        super(props);
    }
    
    render() {
        const { getFieldDecorator } = this.props.form;
        return (
            <>
                {/* AccessKey */}
                <FormItem
                    label="AccessKey"
                >
                    {getFieldDecorator('accessKey', {
                        rules: [
                            {required: true, message: '请填写七牛云的accessKey'}
                        ],
                        initialValue: this.props.upload.accessKey || '',
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
                            {required: true, message: '请填写七牛云的secretKey'}
                        ],
                        initialValue: this.props.upload.secretKey || '',
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
                            {required: true, message: '请填写七牛云的空间名'}
                        ],
                        initialValue: this.props.upload.bucket || '',
                    })(
                        <Input />
                    )}
                </FormItem>
                {/* 七牛云域名 */}
                <FormItem
                    label="七牛云域名"
                >
                    {getFieldDecorator('origin', {
                        rules: [
                            {required: true, message: '请填写七牛云的域名'}
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

export default OptionsUploadQiNiuFormItems;
