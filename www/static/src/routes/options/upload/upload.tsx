import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import React, { useEffect } from 'react';
import { Form } from 'antd';
import { Button, Select } from 'antd';
import { inject, observer } from '@admin/utils/mobx-react';
import { OptionsUploadProps } from './upload.model';
import { UploadEnum } from './upload.enum';
import BreadCrumb from '../../../components/breadcrumb';
import OptionsUploadQiNiuFormItems from './qiniu/qiniu';
import './upload.less';
import OptionsUploadUpYunFormItems from './upyun/upyun';
import OptionsUploadAliYunFormItems from './aliyun/aliyun';
import OptionsUploadTencentFormItems from './tencent/tencent';
import OptionsUploadCloudFormItems from './cloud/cloud';

const uploadProviders = () => ([
    { value: UploadEnum.Local, label: i18n.t("本地") },
    { value: UploadEnum.QiNiu, label: i18n.t("七牛云") },
    { value: UploadEnum.Upyun, label: i18n.t("又拍云") },
    { value: UploadEnum.AliYun, label: i18n.t("阿里云 OSS") },
    { value: UploadEnum.AWSS3, label: i18n.t("AWS S3 / S3 兼容存储") },
    { value: UploadEnum.Tencent, label: i18n.t("腾讯云 COS") },
    { value: UploadEnum.CloudflareR2, label: 'Cloudflare R2' },
    { value: UploadEnum.MinIO, label: 'MinIO' },
    { value: UploadEnum.BackblazeB2, label: 'Backblaze B2' },
    { value: UploadEnum.Wasabi, label: 'Wasabi' },
    { value: UploadEnum.DigitalOcean, label: 'DigitalOcean Spaces' },
    { value: UploadEnum.VercelBlob, label: 'Vercel Blob' },
]);

function OptionsUploadForm(props: OptionsUploadProps) {
    useTranslation('admin');
    const [form] = Form.useForm();

    useEffect(() => {
        let upload = window.SysConfig.options.upload;
        if (typeof upload === 'string') {
            upload = JSON.parse(upload);
        }
        props.optionsUploadStore.setUpload(upload);
    }, [props.optionsUploadStore]);

    function renderUploadItems() {
        const { upload } = props.optionsUploadStore;
        const type: UploadEnum = upload.type;
        switch (type) {
            case UploadEnum.QiNiu:
                return <OptionsUploadQiNiuFormItems upload={upload} />;
            case UploadEnum.Upyun:
                return <OptionsUploadUpYunFormItems upload={upload} />;
            case UploadEnum.AliYun:
                return <OptionsUploadAliYunFormItems upload={upload} />;
            case UploadEnum.Tencent:
                return <OptionsUploadTencentFormItems upload={upload} />;
            case UploadEnum.AWSS3:
            case UploadEnum.CloudflareR2:
            case UploadEnum.MinIO:
            case UploadEnum.BackblazeB2:
            case UploadEnum.Wasabi:
            case UploadEnum.DigitalOcean:
            case UploadEnum.VercelBlob:
                return <OptionsUploadCloudFormItems key={type} upload={upload} />;
            default:
                return null;
        }
    }

    function handleSubmit(values: any) {
        props.optionsUploadStore.uploadSave(values);
    }

    const { upload, setUpload } = props.optionsUploadStore;
    return (
        <>
            <BreadCrumb className="breadcrumb" {...props} />
            <div className="page-list">
                <h3 className="page-title">{i18n.t("上传设置")}</h3>
                <div className="option-upload-page">
                    <Form
                        form={form}
                        onFinish={handleSubmit}
                        layout="vertical"
                        scrollToFirstError
                    >
                        <Form.Item
                            label={i18n.t("图片上传至")}
                            name="type"
                            initialValue={upload.type || UploadEnum.Local}
                        >
                            <Select
                                style={{ width: '100%' }}
                                options={uploadProviders()}
                                onChange={(value) => {
                                    form.resetFields();
                                    setUpload({ type: value });
                                }}
                            />
                        </Form.Item>
                        {renderUploadItems()}
                        <Form.Item>
                            <Button type="primary" htmlType="submit">
                                {i18n.t("提交")}
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            </div>
        </>
    );
}
export default inject('optionsUploadStore')(observer(OptionsUploadForm));
