import React from 'react';
import { Form, Input } from 'antd';
const FormItem = Form.Item;
import { OptionsUploadItemsProps } from '../upload.model';

class OptionsUploadUpYunFormItems extends React.Component<OptionsUploadItemsProps, {}> {

    constructor(props: OptionsUploadItemsProps) {
        super(props);
    }
    
    render() {
        const { getFieldDecorator } = this.props.form;
        return (
            <>
                {/* 操作员 */}
                <FormItem
                    label="操作员"
                >
                    {getFieldDecorator('operater', {
                        rules: [
                            {required: true, message: '请填写又拍云的操作员'}
                        ],
                        initialValue: this.props.upload.operater || '',
                    })(
                        <Input />
                    )}
                </FormItem>
                {/* 操作员密码 */}
                <FormItem
                    label="SecretKey"
                >
                    {getFieldDecorator('操作员密码', {
                        rules: [
                            {required: true, message: '请填写又拍云的操作员密码'}
                        ],
                        initialValue: this.props.upload.password || '',
                    })(
                        <Input />
                    )}
                </FormItem>
                {/* 空间名(Bucket) */}
                <FormItem
                    label="空间名(Bucket)"
                >
                    {getFieldDecorator('upyunBucket', {
                        rules: [
                            {required: true, message: '请填写又拍云的服务名'}
                        ],
                        initialValue: this.props.upload.upyunBucket || '',
                    })(
                        <Input />
                    )}
                </FormItem>
                {/* 又拍云域名 */}
                <FormItem
                    label="又拍云域名"
                >
                    {getFieldDecorator('upyunOrigin', {
                        rules: [
                            {required: true, message: '请填写又拍云的域名'}
                        ],
                        initialValue: this.props.upload.upyunOrigin || '',
                    })(
                        <Input />
                    )}
                </FormItem>
                {/* 路径前缀 */}
                <FormItem
                    label="路径前缀"
                >
                    {getFieldDecorator('upyunPrefix', {
                        initialValue: this.props.upload.upyunPrefix || '',
                    })(
                        <Input />
                    )}
                </FormItem>
            </>
        );
    }
}

export default OptionsUploadUpYunFormItems;
