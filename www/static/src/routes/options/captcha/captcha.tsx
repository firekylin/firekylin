import React from 'react';
import {Button, Checkbox, Form, Input, InputNumber, Select, Switch, message} from 'antd';
import BreadCrumb from '../../../components/breadcrumb';
import {RouteComponentProps} from '@admin/utils/router';
import {http} from '../../../utils/http';
import {CaptchaField, fields, providers, defaultProvider, defaults, visibleFields, serialize} from './captcha-schema';

function fieldControl(field: CaptchaField) {
    switch (field.control) {
        case 'select': return <Select options={field.options} />;
        case 'switch': return <Switch />;
        case 'checkboxGroup': return <Checkbox.Group options={field.options} />;
        case 'number': return <InputNumber />;
        case 'input': return <Input autoComplete="off" />;
    }
}

export default function CaptchaSettings(props: RouteComponentProps) {
    const [form] = Form.useForm();
    const [saving, setSaving] = React.useState(false);
    const provider = Form.useWatch('provider', form) || window.SysConfig.options.captcha?.provider || defaultProvider;
    const selected = providers.find(item => item.value === provider);
    const initial = {provider: defaultProvider, ...defaults(), ...window.SysConfig.options.captcha};
    const save = (values: any) => {
        setSaving(true);
        const config = serialize(values);
        http.post('/admin/api/options?method=put', {captcha: JSON.stringify(config)}).subscribe({
            next: res => {
                setSaving(false);
                if (res.errno !== 0) return;
                window.SysConfig.options.captcha = config;
                message.success('验证码设置已保存');
            },
            error: () => {setSaving(false); message.error('保存失败，请重试');},
        });
    };
    return <>
        <BreadCrumb className="breadcrumb" {...props} />
        <div className="page-list">
        <h3 className="page-title">验证码设置</h3>
        <Form form={form} layout="vertical" initialValues={initial} onFinish={save} style={{maxWidth: 640}}>
            <Form.Item label="验证码服务" name="provider"><Select options={providers.map(({value, label}) => ({value, label}))} /></Form.Item>
            {selected?.description && <p>{selected.description}</p>}
            {visibleFields(provider).map(name => {
                const field = fields[name];
                return <Form.Item key={name} label={field.label} name={name} extra={field.extra}
                    valuePropName={field.type === 'boolean' ? 'checked' : 'value'}
                    rules={[{type: field.type, required: field.required}]}>
                    {fieldControl(field)}
                </Form.Item>;
            })}
            <Form.Item><Button type="primary" htmlType="submit" loading={saving}>保存</Button></Form.Item>
        </Form>
    </div></>;
}
