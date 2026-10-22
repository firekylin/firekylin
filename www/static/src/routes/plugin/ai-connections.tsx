import {useEffect, useState} from 'react';
import {Alert, Button, Card, message, Select, Space, Spin, Tag, Typography} from 'antd';
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
    const provider = providers.find(item => item.id === providerId);
    const descriptor = provider?.admin && (window.SysConfig.pluginAdmin || [])
        .find(item => item.id === provider.admin?.pluginId);
    const form = descriptor?.forms.find(item => item.id === provider?.admin?.formId);
    const csrf = {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}};

    useEffect(() => {
        const subscription = http.get<any>('/admin/api/plugins/core-ai/pages/connections').subscribe(res => {
            if (res.errno === 0) {
                const items = (res.data as any).content.providers || [];
                setProviders(items);
                setProviderId(current => items.some((item: Provider) => item.id === current) ? current :
                    items.find((item: Provider) => item.models.some(model => model.selected))?.id || items[0]?.id);
            }
            setLoading(false);
        });
        return () => subscription.unsubscribe();
    }, [reloadKey]);

    useEffect(() => {
        setModelId(provider?.models.find(item => item.selected)?.id || provider?.models[0]?.id);
        setFormValues(undefined);
        if (!provider?.admin) return;
        const {pluginId, formId} = provider.admin;
        const subscription = http.get<any>(`/admin/api/plugins/${pluginId}/forms/${formId}`).subscribe(res => {
            if (res.errno === 0) setFormValues(res.data || {});
        });
        return () => subscription.unsubscribe();
    }, [providerId, reloadKey]);

    const changeProvider = (value: string) => {
        if (value === MORE_PROVIDERS) {
            window.open(NPM_SEARCH, '_blank', 'noopener,noreferrer');
            return;
        }
        setProviderId(value);
    };
    const submit = (_formId: string, values: Record<string, any>) => {
        if (!provider?.admin) return;
        setWorking(true);
        http.post<any>(`/admin/api/plugins/${provider.admin.pluginId}/forms/${provider.admin.formId}`,
            values, csrf).subscribe(res => {
            setWorking(false);
            if (res.errno === 0) {
                message.success((res.data as any).message || '连接配置已保存');
                setReloadKey(key => key + 1);
            }
        });
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
    const selectDefault = () => {
        if (!provider || !modelId) return;
        setWorking(true);
        http.post<any>('/admin/api/plugins/core-ai/actions/select-default',
            {provider: provider.id, model: modelId}, csrf).subscribe(res => {
            setWorking(false);
            if (res.errno === 0) {
                message.success((res.data as any).message || '默认模型已更新');
                setReloadKey(key => key + 1);
            }
        });
    };

    return <div className="fk-content-wrap">
        <Space direction="vertical" size={4} style={{marginBottom: 20, marginInlineStart: PAGE_SECTION_CONTENT_INSET}}>
            <Typography.Title level={3} style={{margin: 0}}>AI 连接</Typography.Title>
            <Typography.Text type="secondary">选择服务商，填写连接信息并测试；需要时将其设为默认。</Typography.Text>
        </Space>
        <Spin spinning={loading || working}>
            <Card title="AI 服务商" style={{marginBottom: 16}}>
                <Select aria-label="选择 AI 服务商" value={providerId} onChange={changeProvider}
                    placeholder="选择 AI 服务商" style={{width: '100%', maxWidth: 420}}
                    options={[...providers.map(item => ({label: item.label, value: item.id})),
                        {label: '添加更多 AI 服务商', value: MORE_PROVIDERS}]} />
                {provider ? <Tag style={{marginInlineStart: 12}} color={provider.configured ? 'green' : 'default'}>
                    {provider.configured === true ? '已配置' : provider.configured === false ? '未配置' : '状态未知'}
                </Tag> : null}
            </Card>
            {provider && form ? <PageForm key={provider.id} item={form} values={formValues} submit={submit} /> : null}
            {provider && !form ? <Alert type="warning" showIcon style={{marginBottom: 16}}
                message="该服务商没有提供连接配置表单" /> : null}
            {provider ? <Card title="模型与连接测试">
                <Space direction="vertical" style={{width: '100%'}}>
                    <Select aria-label="选择 AI 模型" value={modelId} onChange={setModelId}
                        style={{width: '100%', maxWidth: 420}}
                        options={provider.models.map(item => ({label: item.label, value: item.id}))} />
                    <Space>
                        <Button onClick={testConnection} disabled={!provider.admin || !modelId}>测试连接</Button>
                        <Button type="primary" onClick={selectDefault} disabled={!modelId || provider.configured === false}>
                            设为默认
                        </Button>
                    </Space>
                    <Typography.Text type="secondary">
                        {provider.models.some(item => item.selected) ? '此服务商是当前默认服务商。' : '切换下拉框不会改变当前默认服务商。'}
                    </Typography.Text>
                </Space>
            </Card> : null}
        </Spin>
    </div>;
}
