import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import { Form } from 'antd';
import { Input } from 'antd';
import { OptionsUploadItemsProps } from '../upload.model';

function OptionsUploadUpYunFormItems(props: OptionsUploadItemsProps) {
    useTranslation('admin');
    return (
        <>
            {/* 操作员 */}
            <Form.Item
                label={i18n.t("操作员")}
                name="operater"
                rules={[{ required: true, message: i18n.t("请填写又拍云的操作员") }]}
                initialValue={props.upload.operater || ''}
            >
                <Input />
            </Form.Item>
            {/* 操作员密码 */}
            <Form.Item
                label={i18n.t("操作员密码")}
                name="password"
                rules={[{ required: true, message: i18n.t("请填写又拍云的操作员密码") }]}
                initialValue={props.upload.password || ''}
            >
                <Input />
            </Form.Item>
            {/* 空间名(Bucket) */}
            <Form.Item
                label={i18n.t("空间名(Bucket)")}
                name="upyunBucket"
                rules={[{ required: true, message: i18n.t("请填写又拍云的服务名") }]}
                initialValue={props.upload.upyunBucket || ''}
            >
                <Input />
            </Form.Item>
            {/* 又拍云域名 */}
            <Form.Item
                label={i18n.t("又拍云域名")}
                name="upyunOrigin"
                rules={[{ required: true, message: i18n.t("请填写又拍云的域名") }]}
                initialValue={props.upload.upyunOrigin || ''}
            >
                <Input />
            </Form.Item>
            {/* 路径前缀 */}
            <Form.Item
                label={i18n.t("路径前缀")}
                name="upyunPrefix"
                initialValue={props.upload.upyunPrefix || ''}
            >
                <Input />
            </Form.Item>
        </>
    );
}

export default OptionsUploadUpYunFormItems;
