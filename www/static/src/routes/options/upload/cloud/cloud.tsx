import React from 'react';
import { Form, Input } from 'antd';
import { OptionsUploadItemsProps } from '../upload.model';
import { UploadEnum } from '../upload.enum';

type Field = {
    name: string;
    label: string;
    required?: boolean;
    secret?: boolean;
    placeholder?: string;
};

const commonFields: Field[] = [
    {name: 'accessKeyId', label: 'Access Key ID', required: true},
    {name: 'accessKeySecret', label: 'Secret Access Key', required: true, secret: true},
    {name: 'bucket', label: '存储桶 (Bucket)', required: true},
    {name: 'region', label: '服务区域 (Region)', required: true},
    {name: 'origin', label: '公开访问域名', required: true, placeholder: 'https://cdn.example.com'},
    {name: 'prefix', label: '路径前缀', placeholder: 'images'}
];

function fieldsFor(type: UploadEnum): Field[] {
    if (type === UploadEnum.VercelBlob) {
        return [
            {name: 'token', label: 'BLOB_READ_WRITE_TOKEN', required: true, secret: true},
            {name: 'prefix', label: '路径前缀', placeholder: 'images'}
        ];
    }
    if (type === UploadEnum.CloudflareR2) {
        return [
            {name: 'accountId', label: 'Cloudflare Account ID', required: true},
            ...commonFields.filter(field => field.name !== 'region')
        ];
    }
    if (type === UploadEnum.MinIO) {
        return [
            ...commonFields.filter(field => field.name !== 'region'),
            {name: 'endpoint', label: 'MinIO Endpoint', required: true, placeholder: 'https://minio.example.com'}
        ];
    }
    if (type === UploadEnum.AWSS3) {
        return [
            ...commonFields.map(field => field.name === 'origin' ? {...field, required: false} : field),
            {name: 'endpoint', label: '自定义 Endpoint', placeholder: '可选，用于 S3 兼容存储'}
        ];
    }
    return commonFields;
}

export default function OptionsUploadCloudFormItems({upload}: OptionsUploadItemsProps) {
    return (
        <>
            {fieldsFor(upload.type).map(field => (
                <Form.Item
                    key={field.name}
                    label={field.label}
                    name={field.name}
                    initialValue={upload[field.name] || ''}
                    rules={field.required ? [{required: true, message: `请填写 ${field.label}`}] : undefined}
                >
                    {field.secret ? <Input.Password autoComplete="new-password" /> : <Input placeholder={field.placeholder} />}
                </Form.Item>
            ))}
        </>
    );
}
