import {useEffect, useState} from 'react';
import {Alert, Button, Card, Form, Input, message, Radio} from 'antd';
import axios from 'axios';

type Connection = {mode: 'local' | 'github'; repository?: string; token?: string};

export default function ExtensionGitHub() {
    const [form] = Form.useForm<Connection>();
    const mode = Form.useWatch('mode', form) || 'local';
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        axios.get('/admin/api/extension-github', {signal: controller.signal}).then(response => {
            if (response.data.errno !== 0) throw new Error('读取网站管理方式失败');
            const status = response.data.data;
            setConnected(Boolean(status.connected));
            form.setFieldsValue({mode: status.connected ? 'github' : 'local', repository: status.repository || '', token: ''});
        }).catch(reason => { if (!controller.signal.aborted) setError(reason.message || '读取网站管理方式失败') })
            .finally(() => { if (!controller.signal.aborted) setLoading(false) });
        return () => controller.abort();
    }, [form]);
    const submit = async(values: Connection) => {
        setSaving(true);
        try {
            if (values.mode === 'local' && !connected) { message.success('已选择本地管理'); return }
            const payload = values.mode === 'local' ? {disconnect: true} :
                {repository: values.repository, token: values.token};
            const response = await axios.post('/admin/api/extension-github', payload,
                {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}});
            if (response.data.errno !== 0) throw new Error(response.data.errmsg || '保存失败');
            setConnected(Boolean(response.data.data.connected));
            form.setFieldsValue({mode: values.mode, repository: response.data.data.repository || '', token: ''});
            message.success(values.mode === 'local' ? '已选择本地管理' : 'GitHub 仓库连接已保存');
        } catch { message.error('保存失败，请检查仓库地址和令牌权限') }
        finally { setSaving(false) }
    };
    return <Card title="网站管理方式" style={{marginTop: 20}}>
        {error ? <Alert type="error" showIcon title={error} /> : <Form form={form} layout="vertical"
            initialValues={{mode: 'local'}} onFinish={submit} disabled={loading || saving}>
            <Form.Item name="mode" label="网站管理方式">
                <Radio.Group options={[{label: '本地管理', value: 'local'}, {label: 'GitHub', value: 'github'}]} />
            </Form.Item>
            {mode === 'github' && <>
                <Alert type="info" showIcon title={<span>GitHub 更新需要在网站仓库默认分支配置 <a href="https://github.com/firekylin/firekylin/blob/master/docs/plugins.md#github-repository-connection" target="_blank" rel="noreferrer">扩展更新工作流</a>。安装或删除扩展会提交工作流请求，由工作流创建待审核的 PR。</span>} style={{marginBottom: 20}} />
                <Form.Item name="repository" label="Firekylin 网站仓库地址" rules={[{required: true, type: 'url'}]}>
                    <Input placeholder="https://github.com/owner/repository" />
                </Form.Item>
                <Form.Item name="token" label="GitHub Token" rules={[{required: !connected}]}
                    extra={<span>前往 <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">GitHub 申请令牌</a>，
                        请确保令牌对该网站仓库有写入权限。{connected && '留空保留现有令牌；更换仓库时需提供新令牌。'}</span>}>
                    <Input.Password autoComplete="new-password" />
                </Form.Item>
            </>}
            {mode === 'local' && connected && <p>保存后将移除已保存的 GitHub 仓库连接和令牌。</p>}
            <Button type="primary" htmlType="submit" loading={saving}>保存管理方式</Button>
        </Form>}
    </Card>;
}
