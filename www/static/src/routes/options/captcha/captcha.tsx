import React from 'react';
import {Button, Checkbox, Form, Input, Select, Switch, message} from 'antd';
import BreadCrumb from '../../../components/breadcrumb';
import {RouteComponentProps} from '@admin/utils/router';
import {http} from '../../../utils/http';

export default function CaptchaSettings(props: RouteComponentProps) {
    const [form] = Form.useForm();
    const [saving, setSaving] = React.useState(false);
    const provider = Form.useWatch('provider', form);
    const initial = {provider: 'none', siteKey: '', areas: ['login', 'comment'], theme: 'auto', language: 'auto', ...window.SysConfig.options.captcha};
    const save = (values: any) => {
        setSaving(true);
        const config = {...values, siteKey: values.siteKey || '', secret: values.secret || '', theme: values.theme || 'auto', language: values.language || 'auto', areas: values.areas || []};
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
            <Form.Item label="验证码服务" name="provider"><Select options={[
                {value: 'none', label: '不使用'}, {value: 'turnstile', label: 'Cloudflare Turnstile'}, {value: 'recaptcha', label: 'Google reCAPTCHA v3'},
            ]} /></Form.Item>
            {provider !== 'none' && <>
                <Form.Item label="Site Key" name="siteKey" rules={[{required: true}]}><Input /></Form.Item>
                <Form.Item label="私钥" name="secret"><Input autoComplete="off" /></Form.Item>
                <Form.Item label="语言" name="language"><Select options={[
                    {value: 'auto', label: '自动'}, {value: 'zh-CN', label: '简体中文'}, {value: 'zh-TW', label: '繁体中文'}, {value: 'en', label: 'English'},
                ]} /></Form.Item>
                {provider === 'turnstile' && <>
                    <p>以下展示设置仅用于登录页，评论由 Waline 客户端按其默认行为展示验证码。</p>
                    <Form.Item label="主题" name="theme"><Select options={[{value: 'auto', label: '自动'}, {value: 'light', label: '浅色'}, {value: 'dark', label: '深色'}]} /></Form.Item>
                    <Form.Item label="验证通过前隐藏提交按钮" name="hideSubmit" valuePropName="checked"><Switch /></Form.Item>
                </>}
                {provider === 'recaptcha' && <p>reCAPTCHA v3 使用无交互评分，提交时自动验证，最低分数为 0.5，不支持主题与提交按钮显隐。</p>}
            </>}
            <Form.Item label="生效区域" name="areas"><Checkbox.Group options={[{value: 'login', label: '登录'}, {value: 'comment', label: '评论'}]} /></Form.Item>
            <Form.Item><Button type="primary" htmlType="submit" loading={saving}>保存</Button></Form.Item>
        </Form>
    </div></>;
}
