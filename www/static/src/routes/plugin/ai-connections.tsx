import {useEffect, useState} from 'react';
import {Alert, Button, Card, Form, message, Select, Space, Spin, Typography} from 'antd';
import {firstValueFrom} from 'rxjs';
import BreadCrumb from '../../components/breadcrumb';
import {PageForm, PAGE_SECTION_CONTENT_INSET} from '../../components/protocol/page-section';
import {http} from '../../utils/http';

const MORE_PROVIDERS = '__more_providers__';
const NPM_SEARCH = 'https://www.npmjs.com/search?q=firekylin-plugin-ai-provider';

interface Provider {
    id: string;
    label: string;
    configured?: boolean;
    models: Array<{id: string; label: string; selected: boolean}>;
    admin?: {pluginId: string; formId: string; testActionId: string};
}

export default function AIConnections() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [providerId, setProviderId] = useState<string>();
    const [modelId, setModelId] = useState<string>();
    const [formValues, setFormValues] = useState<Record<string, any>>();
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [settingsDirty, setSettingsDirty] = useState(false);
    const [providerForm] = Form.useForm();
    const provider = providers.find(item => item.id === providerId);
    const descriptor = provider?.admin && (window.SysConfig.pluginAdmin || [])
        .find(item => item.id === provider.admin?.pluginId);
    const form = descriptor?.forms.find(item => item.id === provider?.admin?.formId);
    const csrf = {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}};

    useEffect(() => {
        const subscription = http.get<any>('/admin/api/ai-connections').subscribe(res => {
            if (res.errno === 0) {
                const items = (res.data as any).providers || [];
                setProviders(items);
                setProviderId(items.find((item: Provider) => item.models.some(model => model.selected))?.id);
            }
            setLoading(false);
        });
        return () => subscription.unsubscribe();
    }, [reloadKey]);

    useEffect(() => {
        setModelId(provider?.models.find(item => item.selected)?.id || provider?.models[0]?.id);
        setFormValues(undefined);
        setSettingsDirty(false);
        if (!provider?.admin) return;
        const {pluginId, formId} = provider.admin;
        const subscription = http.get<any>(`/admin/api/plugins/${pluginId}/forms/${formId}`).subscribe(res => {
            if (res.errno === 0) setFormValues(res.data || {});
        });
        return () => subscription.unsubscribe();
    }, [providerId, reloadKey]);

    const changeProvider = (value: string | undefined) => {
        if (value === MORE_PROVIDERS) {
            window.open(NPM_SEARCH, '_blank', 'noopener,noreferrer');
            return;
        }
        setProviderId(value);
    };
    const testConnection = () => {
        if (!provider?.admin || !modelId) return;
        setWorking(true);
        http.post<any>(`/admin/api/plugins/${provider.admin.pluginId}/actions/${provider.admin.testActionId}`,
            {model: modelId}, csrf).subscribe(res => {
            setWorking(false);
            if (res.errno === 0) message.success((res.data as any).message || '连接成功');
        });
    };
    const savedProvider = providers.find(item => item.models.some(model => model.selected));
    const savedModel = savedProvider?.models.find(item => item.selected)?.id;
    const dirty = providerId !== savedProvider?.id || (providerId && modelId !== savedModel) || settingsDirty;
    const saveConnection = async () => {
        if (!dirty || (provider && !modelId)) return;
        setWorking(true);
        try {
            if (provider?.admin && form && settingsDirty) {
                const values = await providerForm.validateFields();
                const configured = await firstValueFrom(http.post<any>(
                    `/admin/api/plugins/${provider.admin.pluginId}/forms/${provider.admin.formId}`, values, csrf));
                if (configured.errno !== 0) return;
            }
            const res = await firstValueFrom(http.post<any>('/admin/api/ai-connections',
                {provider: provider?.id || null, model: modelId}, csrf));
            if (res.errno === 0) {
                message.success('AI 连接已保存');
                setSettingsDirty(false);
                setReloadKey(key => key + 1);
            }
        } catch (error) {
            // Ant Design displays field validation errors next to the affected controls.
        } finally {
            setWorking(false);
        }
    };

    return <div className="fk-content-wrap">
        <BreadCrumb />
        <Spin spinning={loading || working}>
            <Card title="AI 服务商" style={{marginBottom: 16}}>
                <Select aria-label="选择 AI 服务商" value={providerId} onChange={changeProvider} allowClear
                    placeholder="请选择" style={{width: '100%', maxWidth: 420}}
                    options={[...providers.map(item => ({label: item.label, value: item.id})),
                        {label: '添加更多 AI 服务商', value: MORE_PROVIDERS}]} />
            </Card>
            {provider && form && formValues ? <PageForm key={provider.id} item={form} values={formValues}
                submit={() => {}} form={providerForm} hideSubmit onValuesChange={() => setSettingsDirty(true)} /> : null}
            {provider && !form ? <Alert type="warning" showIcon style={{marginBottom: 16}}
                message="该服务商没有提供连接配置表单" /> : null}
            {provider ? <Card title="模型与连接测试">
                <Space direction="vertical" style={{width: '100%'}}>
                    <Select aria-label="选择 AI 模型" value={modelId} onChange={setModelId}
                        style={{width: '100%', maxWidth: 420}}
                        options={provider.models.map(item => ({label: item.label, value: item.id}))} />
                    <Button onClick={testConnection} disabled={!provider.admin || !modelId}>测试连接</Button>
                    <Typography.Text type="secondary">
                        {provider.models.some(item => item.selected) ? '此服务商是当前默认服务商。' : '切换下拉框不会改变当前默认服务商。'}
                    </Typography.Text>
                </Space>
            </Card> : null}
            <Button type="primary" aria-label="保存" onClick={saveConnection} disabled={!dirty || Boolean(provider && !modelId)}
                style={{marginTop: 16, marginInlineStart: PAGE_SECTION_CONTENT_INSET}}>保存</Button>
        </Spin>
    </div>;
}
