import {useEffect, useState} from 'react';
import {Alert, Button, Card, Form, Input, message, Space} from 'antd';
import axios from 'axios';

type Connection = {repository: string; token?: string};

export default function ExtensionGitHub() {
    const [form] = Form.useForm<Connection>();
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        axios.get('/admin/api/extension-github', {signal: controller.signal}).then(response => {
            if (response.data.errno !== 0) throw new Error('读取 GitHub 连接失败');
            const status = response.data.data;
            setConnected(Boolean(status.connected));
            form.setFieldsValue({repository: status.repository || '', token: ''});
        }).catch(reason => { if (!controller.signal.aborted) setError(reason.message || '读取 GitHub 连接失败') })
            .finally(() => { if (!controller.signal.aborted) setLoading(false) });
        return () => controller.abort();
    }, [form]);
    const submit = async(values: Connection) => {
        setSaving(true);
        try {
            const response = await axios.post('/admin/api/extension-github', values,
                {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}});
            if (response.data.errno !== 0) throw new Error(response.data.errmsg || '连接失败');
            setConnected(true);
            form.setFieldsValue({repository: response.data.data.repository, token: ''});
            message.success('GitHub 仓库连接已保存');
        } catch { message.error('无法连接 GitHub 仓库，请检查仓库地址和访问权限') }
        finally { setSaving(false) }
    };
    const disconnect = async() => {
        setSaving(true);
        try {
            const response = await axios.post('/admin/api/extension-github', {disconnect: true},
                {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}});
            if (response.data.errno !== 0) throw new Error('删除连接失败');
            setConnected(false); form.resetFields(); message.success('GitHub 连接已移除');
        } catch { message.error('移除 GitHub 连接失败') }
        finally { setSaving(false) }
    };
    return <Card title="GitHub 仓库连接" style={{marginTop: 20}}>
        <p>连接站点源代码仓库。此连接为后续 GitHub 更新功能做准备，扩展安装仍使用本地更新。</p>
        {error ? <Alert type="error" showIcon title={error} /> : <Form form={form} layout="vertical"
            onFinish={submit} disabled={loading || saving}>
            <Form.Item name="repository" label="GitHub 仓库地址" rules={[{required: true, type: 'url'}]}>
                <Input placeholder="https://github.com/owner/repository" />
            </Form.Item>
            <Form.Item name="token" label="GitHub 访问令牌" rules={[{required: !connected}]}
                extra={connected ? '留空可保留当前令牌；更换仓库时需提供新令牌。' : '需要对该仓库有写入权限。'}>
                <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Space><Button type="primary" htmlType="submit" loading={saving}>保存连接</Button>
                {connected && <Button danger onClick={disconnect} disabled={saving}>移除连接</Button>}</Space>
        </Form>}
    </Card>;
}
