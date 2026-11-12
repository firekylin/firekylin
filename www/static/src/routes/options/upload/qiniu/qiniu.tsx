import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import { Form } from 'antd';
import { Input } from 'antd';
import { OptionsUploadItemsProps } from '../upload.model';

function OptionsUploadQiNiuFormItems(props: OptionsUploadItemsProps) {
    useTranslation('admin');
    return (
        <>
            {/* AccessKey */}
            <Form.Item
                label="AccessKey"
                name="accessKey"
                rules={[{ required: true, message: i18n.t("请填写七牛云的accessKey") }]}
                initialValue={props.upload.accessKey || ''}
            >
                <Input />
            </Form.Item>
            {/* SecretKey */}
            <Form.Item
                label="SecretKey"
                name="secretKey"
                rules={[{ required: true, message: i18n.t("请填写七牛云的secretKey") }]}
                initialValue={props.upload.secretKey || ''}
            >
                <Input />
            </Form.Item>
            {/* 空间名(Bucket) */}
            <Form.Item
                label={i18n.t("空间名(Bucket)")}
                name="bucket"
                rules={[{ required: true, message: i18n.t("请填写七牛云的空间名") }]}
                initialValue={props.upload.bucket || ''}
            >
                <Input />
            </Form.Item>
            {/* 七牛云域名 */}
            <Form.Item
                label={i18n.t("七牛云域名")}
                name="origin"
                rules={[{ required: true, message: i18n.t("请填写七牛云的域名") }]}
                initialValue={props.upload.origin || ''}
            >
                <Input />
            </Form.Item>
            {/* 路径前缀 */}
            <Form.Item
                label={i18n.t("路径前缀")}
                name="prefix"
                initialValue={props.upload.prefix || ''}
            >
                <Input />
            </Form.Item>
        </>
    );
}

export default OptionsUploadQiNiuFormItems;
