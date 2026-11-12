import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import {useEffect, useState} from 'react';
import {Alert, Button, Card, Form, Input, message, Radio} from 'antd';
import axios from 'axios';

type Connection = {mode: 'local' | 'github'; repository?: string; token?: string};

export default function ExtensionGitHub() {
    useTranslation('admin');
    const [form] = Form.useForm<Connection>();
    const mode = Form.useWatch('mode', form) || 'local';
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        axios.get('/admin/api/extension-github', {signal: controller.signal}).then(response => {
            if (response.data.errno !== 0) throw new Error(i18n.t("读取网站管理方式失败"));
            const status = response.data.data;
            setConnected(Boolean(status.connected));
            form.setFieldsValue({mode: status.connected ? 'github' : 'local', repository: status.repository || '', token: ''});
        }).catch(reason => { if (!controller.signal.aborted) setError(reason.message || i18n.t("读取网站管理方式失败")) })
            .finally(() => { if (!controller.signal.aborted) setLoading(false) });
        return () => controller.abort();
    }, [form]);
    const submit = async(values: Connection) => {
        setSaving(true);
        try {
            if (values.mode === 'local' && !connected && !error) { message.success(i18n.t("已选择本地管理")); return }
            const payload = values.mode === 'local' ? {disconnect: true} :
                {repository: values.repository, token: values.token};
            const response = await axios.post('/admin/api/extension-github', payload,
                {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}});
            if (response.data.errno !== 0) throw new Error(i18n.t(response.data.errmsg || '') || i18n.t("保存失败"));
            setConnected(Boolean(response.data.data.connected));
            setError('');
            form.setFieldsValue({mode: values.mode, repository: response.data.data.repository || '', token: ''});
            message.success(values.mode === 'local' ? i18n.t("已选择本地管理") : i18n.t("GitHub 仓库连接已保存"));
        } catch { message.error(i18n.t("保存失败，请检查仓库地址和令牌权限")) }
        finally { setSaving(false) }
    };
    return <Card title={i18n.t("网站管理方式")} style={{marginTop: 20}}>
        {error && <Alert type="error" showIcon title={i18n.t("读取网站管理方式失败")}
            description={i18n.t("可以重新填写 GitHub 仓库和令牌，或选择本地管理并保存以移除原连接。")} style={{marginBottom: 20}} />}
        <Form form={form} layout="vertical"
            initialValues={{mode: 'local'}} onFinish={submit} disabled={loading || saving}>
            <Form.Item name="mode" label={i18n.t("网站管理方式")}>
                <Radio.Group options={[{label: i18n.t("本地管理"), value: 'local'}, {label: 'GitHub', value: 'github'}]} />
            </Form.Item>
            {mode === 'github' && <>
                <Alert type="info" showIcon title={i18n.t("安装或删除扩展时会在网站仓库创建待审核的 PR。仓库不应跟踪依赖锁文件。")} style={{marginBottom: 20}} />
                <Form.Item name="repository" label={i18n.t("Firekylin 网站仓库地址")} rules={[{required: true, type: 'url'}]}>
                    <Input placeholder="https://github.com/owner/repository" />
                </Form.Item>
                <Form.Item name="token" label="GitHub Token" rules={[{required: !connected}]}
                    extra={<span>{i18n.t("前往 ")}<a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">{i18n.t("GitHub 申请令牌")}</a>{i18n.t("， 请确保令牌对该网站仓库具有 Contents 和 Pull requests 的写入权限。")}{connected && i18n.t("留空保留现有令牌；更换仓库时需提供新令牌。")}</span>}>
                    <Input.Password autoComplete="new-password" />
                </Form.Item>
            </>}
            {mode === 'local' && connected && <p>{i18n.t("保存后将移除已保存的 GitHub 仓库连接和令牌。")}</p>}
            <Button type="primary" htmlType="submit" loading={saving}>{i18n.t("保存管理方式")}</Button>
        </Form>
    </Card>;
}
