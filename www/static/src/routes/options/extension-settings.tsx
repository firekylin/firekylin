import {useEffect, useState} from 'react';
import {Alert, Button, Card, Form, Input, message, Spin} from 'antd';
import axios from 'axios';
import BreadCrumb from '../../components/breadcrumb';

type Settings = {pluginRegistry: string; themeRegistry: string};

export default function ExtensionSettings(props: any) {
    const [form] = Form.useForm<Settings>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        axios.get('/admin/api/extension-settings', {signal: controller.signal}).then(response => {
            if (response.data.errno !== 0) throw new Error(response.data.errmsg || '读取设置失败');
            form.setFieldsValue(response.data.data.settings);
        }).catch(reason => { if (!controller.signal.aborted) setError(reason.message || '读取设置失败') })
            .finally(() => { if (!controller.signal.aborted) setLoading(false) });
        return () => controller.abort();
    }, [form]);
    const save = async(settings: Settings) => {
        setSaving(true);
        try {
            const response = await axios.post('/admin/api/extension-settings', {settings},
                {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}});
            if (response.data.errno !== 0) throw new Error(response.data.errmsg || '保存设置失败');
            form.setFieldsValue(response.data.data.settings);
            message.success('扩展设置已保存');
        } catch (reason: any) { message.error(reason.response?.data?.message || reason.message || '保存设置失败') }
        finally { setSaving(false) }
    };
    return <div className="fk-content-wrap"><BreadCrumb {...props} /><div className="page-list">
        <h3 className="page-title">扩展设置</h3>
        {error ? <Alert type="error" showIcon title={error} /> : <Spin spinning={loading}>
            <Card title="市场 Registry">
                <Form form={form} layout="vertical" onFinish={save} disabled={loading || saving}>
                    <Form.Item label="插件市场" name="pluginRegistry" rules={[{required: true, type: 'url'}]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="主题市场" name="themeRegistry" rules={[{required: true, type: 'url'}]}>
                        <Input />
                    </Form.Item>
                    <p>Registry 支持官方 firekylin/plugins 仓库和 firekylin.lithub.cc/plugins 下的 HTTPS 地址。</p>
                    <Button type="primary" htmlType="submit" loading={saving}>保存</Button>
                </Form>
            </Card>
        </Spin>}
    </div></div>;
}
