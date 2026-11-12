import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import {useEffect, useRef, useState} from 'react';
import {Alert, Button, Card, Dropdown, Form, message, Modal, Select, Space, Spin, Tabs, Typography} from 'antd';
import {StarFilled, StarOutlined} from '@ant-design/icons';
import {firstValueFrom} from 'rxjs';
import BreadCrumb from '../../components/breadcrumb';
import {SAVED_SECRET_MASK} from '../../components/protocol/form-field';
import {PageForm, PAGE_SECTION_CONTENT_INSET} from '../../components/protocol/page-section';
import {http} from '../../utils/http';
import {useRouteComponentProps} from '../../utils/router';
import '../options/ai-settings.less';
import './ai-connections.less';

const MORE_PROVIDERS = '__more_providers__';
const PROVIDER_SEARCH = '/plugin-management/install?q=firekylin-plugin-ai-provider-';

interface Provider {
    id: string;
    label: string;
    configured?: boolean;
    removable?: boolean;
    models: Array<{id: string; label: string; selected: boolean}>;
    admin?: {pluginId: string; formId: string; testActionId: string};
}

export default function AIConnections() {
    useTranslation('admin');
    const [modal, modalContext] = Modal.useModal();
    const {history} = useRouteComponentProps();
    const [providers, setProviders] = useState<Provider[]>([]);
    const [providerId, setProviderId] = useState<string>();
    const addButton = useRef<HTMLButtonElement>(null);
    const [adding, setAdding] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [formReload, setFormReload] = useState(0);
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
    const hasSavedApiKey = provider?.configured === true && form?.fields.some(item =>
        item.name === 'apiKey' && item.type === 'password');
    const displayedFormValues = formValues && hasSavedApiKey
        ? {...formValues, apiKey: SAVED_SECRET_MASK} : formValues;
    const csrf = {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}};

    useEffect(() => {
        setLoading(true);
        setLoadError('');
        const subscription = http.get<any>('/admin/api/ai-connections').subscribe(res => {
            if (res.errno === 0) {
                const items = (res.data as any).providers || [];
                setProviders(items);
                setProviderId(current => items.some((item: Provider) => item.id === current && item.configured !== false)
                    ? current : items.find((item: Provider) => item.models.some(model => model.selected))?.id ||
                        items.find((item: Provider) => item.configured !== false)?.id);
            }
            else setLoadError(i18n.t(res.errmsg || '') || i18n.t("读取 AI 连接失败，请重试"));
            setLoading(false);
        });
        return () => subscription.unsubscribe();
    }, [reloadKey]);

    useEffect(() => {
        setModelId(provider?.models.find(item => item.selected)?.id || provider?.models[0]?.id);
        setFormValues(undefined);
        setFormError('');
        setFormLoading(Boolean(provider?.admin));
        setSettingsDirty(false);
        if (!provider?.admin) return;
        const {pluginId, formId} = provider.admin;
        const subscription = http.get<any>(`/admin/api/plugins/${pluginId}/forms/${formId}`).subscribe(res => {
            if (res.errno === 0) setFormValues(res.data || {});
            else setFormError(i18n.t(res.errmsg || '') || i18n.t("读取服务商设置失败，请重试"));
            setFormLoading(false);
        });
        return () => subscription.unsubscribe();
    }, [provider, formReload]);

    const changeProvider = (value: string | undefined) => {
        setAdding(false);
        if (value === MORE_PROVIDERS) {
            history.push(PROVIDER_SEARCH);
            return;
        }
        setProviderId(value);
        setAdding(false);
    };
    const testConnection = () => {
        if (!provider?.admin || !modelId) return;
        setWorking(true);
        http.post<any>(`/admin/api/plugins/${provider.admin.pluginId}/actions/${provider.admin.testActionId}`,
            {model: modelId}, csrf).subscribe(res => {
            setWorking(false);
            if (res.errno === 0) message.success(i18n.t((res.data as any).message || '') || i18n.t("连接成功"));
        });
    };
    const busy = loading || working || formLoading;
    const savedProvider = providers.find(item => item.models.some(model => model.selected));
    const savedModel = savedProvider?.models.find(item => item.selected)?.id;
    const dirty = settingsDirty || (providerId === savedProvider?.id && modelId !== savedModel);
    const connections = providers.filter(item => item.configured !== false || item.id === providerId || item.models.some(model => model.selected));
    const removeConnection = async(id: string) => {
        setWorking(true);
        try {
            const res = await firstValueFrom(http.post<any>('/admin/api/ai-connections',
                {action: 'remove', provider: id}, csrf));
            if (res.errno === 0) {
                setProviderId(current => current === id ? undefined : current);
                setReloadKey(key => key + 1);
                message.success(i18n.t("AI 连接已删除"));
            } else throw new Error(i18n.t(res.errmsg || '') || i18n.t("删除连接失败"));
        } finally { setWorking(false) }
    };
    const saveConnection = async () => {
        if (!dirty || (provider && !modelId)) return;
        setWorking(true);
        try {
            if (provider?.admin && form && settingsDirty) {
                const values = await providerForm.validateFields();
                if (!hasSavedApiKey && form.fields.some(field => field.name === 'apiKey' && field.type === 'password') &&
                    (typeof values.apiKey !== 'string' || !values.apiKey.trim())) {
                    providerForm.setFields([{name: 'apiKey', errors: [i18n.t("请输入 API Key")]}]);
                    return;
                }
                if (hasSavedApiKey && values.apiKey === SAVED_SECRET_MASK) delete values.apiKey;
                const configured = await firstValueFrom(http.post<any>(
                    `/admin/api/plugins/${provider.admin.pluginId}/forms/${provider.admin.formId}`, values, csrf));
                if (configured.errno !== 0) return;
            }
            const res = provider?.configured === false || providerId === savedProvider?.id ? await firstValueFrom(http.post<any>('/admin/api/ai-connections',
                {provider: provider?.id || null, model: modelId}, csrf)) : {errno: 0};
            if (res.errno === 0) {
                message.success(i18n.t("AI 连接已保存"));
                setSettingsDirty(false);
                setReloadKey(key => key + 1);
            }
        } catch (error) {
            // Ant Design displays field validation errors next to the affected controls.
        } finally {
            setWorking(false);
        }
    };

    const selectDefault = async(item: Provider) => {
        const model = item.id === providerId ? modelId : item.models.find(model => model.selected)?.id || item.models[0]?.id;
        if (busy || item.configured === false || !model || item.id === savedProvider?.id) return;
        setWorking(true);
        try {
            const res = await firstValueFrom(http.post<any>('/admin/api/ai-connections', {provider: item.id, model}, csrf));
            if (res.errno === 0) {
                setProviders(items => items.map(candidate => ({...candidate, models: candidate.models.map(entry =>
                    ({...entry, selected: candidate.id === item.id && entry.id === model}))})));
                message.success(i18n.t("默认模型已更新"));
            }
        } finally {setWorking(false)}
    };

    const tabContent = <div className="ai-connection-panel" aria-busy={busy}>
        {formError ? <Alert type="error" showIcon title={formError}
            action={<Button onClick={() => setFormReload(value => value + 1)}>{i18n.t("重试")}</Button>} /> : null}
        {provider && form && displayedFormValues ? <PageForm key={provider.id} item={form} values={displayedFormValues}
            submit={() => {}} form={providerForm} disabled={busy} clearOnDestroy hideSubmit onValuesChange={() => setSettingsDirty(true)} /> : null}
        {provider && !form ? <Alert type="warning" showIcon style={{marginBottom: 16}}
            title={i18n.t("该服务商没有提供连接配置表单")} /> : null}
        {provider ? <Card title={i18n.t("模型与连接测试")}>
            <Space orientation="vertical" style={{width: '100%'}}>
                <Select aria-label={i18n.t("选择 AI 模型")} disabled={busy} value={modelId} onChange={setModelId}
                    style={{width: '100%', maxWidth: 420}}
                    options={provider.models.map(item => ({label: item.label, value: item.id}))} />
                <Button onClick={testConnection} disabled={busy || !provider.admin || !modelId || settingsDirty || provider.configured === false}>{i18n.t("测试连接")}</Button>
                <Typography.Text type="secondary">
                    {provider.models.some(item => item.selected) ? i18n.t("此服务商是当前默认服务商。") : provider.configured === false ? i18n.t("新增连接保存后将成为默认服务商。") : i18n.t("点击 Tab 左侧星标可设为默认模型。")}
                    {i18n.t("修改连接配置后，请先保存再测试。")}
                </Typography.Text>
            </Space>
        </Card> : null}
        <Button type="primary" aria-label={i18n.t("保存")} onClick={saveConnection} disabled={busy || Boolean(formError) || !dirty || Boolean(provider && !modelId)}
            style={{marginTop: 16, marginInlineStart: PAGE_SECTION_CONTENT_INSET}}>{i18n.t("保存")}</Button>
    </div>;
    const addProvider = <Dropdown classNames={{root: 'ai-provider-menu'}} trigger={['click']} open={adding} onOpenChange={setAdding} autoFocus
        disabled={busy || Boolean(loadError)} menu={{onClick: ({key}) => changeProvider(key),
            onKeyDown: event => {
                if (event.key === 'Escape') {event.preventDefault(); setAdding(false); addButton.current?.focus()}
            },
            items: [...providers.filter(item => item.configured === false && item.id !== providerId)
                .map(item => ({key: item.id, label: item.label})),
                {key: MORE_PROVIDERS, label: i18n.t("安装更多 AI 服务商")}]}}>
        <Button ref={addButton} type="text" className="ai-provider-add" disabled={busy || Boolean(loadError)}
            aria-label={i18n.t("增加服务商")}
         aria-haspopup="menu" aria-expanded={adding}>
            <span aria-hidden="true">＋</span>{i18n.t("增加服务商")}</Button>
    </Dropdown>;
    return <div className="fk-content-wrap ai-settings-page">
        {modalContext}
        <BreadCrumb />
        <div className="page-list ai-connections">
            <h3 className="page-title">{i18n.t("AI 连接")}</h3>
            <Spin spinning={busy}>
                {loadError ? <Alert type="error" showIcon title={loadError}
                    action={<Button onClick={() => setReloadKey(key => key + 1)}>{i18n.t("重试")}</Button>} /> : null}
                <Tabs type="editable-card" hideAdd locale={{removeAriaLabel: i18n.t("删除服务商")}}
                    onEdit={(key, action) => {
                        const target = connections.find(item => item.id === key);
                        if (action !== 'remove' || !target?.removable || busy) return;
                        modal.confirm({title: i18n.t("删除 {{value0}} 的 AI 连接？", {value0: target.label}),
                            content: i18n.t("将删除连接密钥。使用此服务商的能力需要重新选择模型；插件仍会保留。"),
                            okText: i18n.t("删除"), cancelText: i18n.t("取消"), okButtonProps: {danger: true},
                            onOk: () => removeConnection(target.id)});
                    }} className="ai-provider-tabs" activeKey={providerId} tabBarExtraContent={addProvider}
                    onChange={value => {setProviderId(value); setAdding(false)}}
                    items={connections.map(item => ({key: item.id, label: <span aria-label={item.label} className="ai-provider-label">
                        <button type="button" className={`ai-provider-star${item.id === savedProvider?.id ? ' is-default' : ''}`}
                            aria-label={item.id === savedProvider?.id ? i18n.t("{{value0}}是默认服务商", {value0: item.label}) : i18n.t("将{{value0}}设为默认模型", {value0: item.label})}
                            aria-pressed={item.id === savedProvider?.id}
                            disabled={busy || item.configured === false || settingsDirty || item.id === savedProvider?.id}
                            onKeyDown={event => event.stopPropagation()}
                            onClick={event => {event.stopPropagation(); void selectDefault(item)}}>
                            {item.id === savedProvider?.id ? <StarFilled /> : <StarOutlined />}
                        </button><span>{item.label}</span>
                    </span>, disabled: busy, closable: Boolean(item.removable),
                        children: item.id === providerId ? tabContent : null}))} />
                {!loading && !loadError && !connections.length ? <Typography.Paragraph type="secondary">
                    {i18n.t("尚未配置 AI 连接，请点击“增加服务商”。")}
                </Typography.Paragraph> : null}
            </Spin>
        </div>
    </div>;
}
