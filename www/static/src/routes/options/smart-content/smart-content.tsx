import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import {useEffect, useState} from 'react';
import {Alert, Button, Card, Form, message, Select, Spin, Switch} from 'antd';
import axios from 'axios';
import BreadCrumb from '../../../components/breadcrumb';
import '../ai-settings.less';
import './smart-content.less';

export const getContentFeatures = () => ([
    {name: 'image', label: i18n.t("图片生成和编辑"), description: i18n.t("根据文章生成 16:9 封面，或在媒体管理中通过提示词生成、优化图片，确认后上传到媒体库。")},
    {name: 'commentModeration', label: i18n.t("评论审核"), description: i18n.t("将非管理员的新评论发送给 AI 识别垃圾评论；识别失败时保留待审核状态。")},
    {name: 'commentReply', label: i18n.t("建议回复"), description: i18n.t("根据文章和当前评论生成建议回复，支持亲切、专业和诙谐口吻，确认后手动发送。")},
    {name: 'summary', label: i18n.t("生成摘要"), description: i18n.t("正文超过 250 个字时，概括全文生成摘要并填入内容摘要，可继续编辑。")},
    {name: 'title', label: i18n.t("生成标题"), description: i18n.t("正文超过 250 个字时，生成标题建议，支持编辑、重新生成和确认使用。")},
    {name: 'rewrite', label: i18n.t("智能审阅"), description: i18n.t("正文超过 100 个字时，检查表达和结构，逐处展示差异与修改建议，支持接受、拒绝或手动合并。")},
    {name: 'translate', label: i18n.t("翻译文章"), description: i18n.t("正文超过 10 个字时翻译全文，每次翻译时选择目标语言，并可同时翻译标题。")},
    {name: 'slug', label: i18n.t("生成 Slug"), description: i18n.t("正文超过 250 个字时，生成可编辑的英文 URL 标识，使用时自动检查重名。")},
    {name: 'category', label: i18n.t("智能分类"), description: i18n.t("正文超过 250 个字时，分别从已有分类和标签中选择适合文章的选项并回填。")},
    {name: 'autocomplete', label: i18n.t("内容自动建议"), description: i18n.t("写作暂停时，在光标处提示后续内容；按 Tab 接受，继续输入或按 Esc 忽略。")},
]);

export default function SmartContentSettings(props) {
    useTranslation('admin');
    const [form] = Form.useForm();
    const enabledFeatures = Form.useWatch('features', form) || {};
    const [providers, setProviders] = useState<Array<{id: string; label: string; configured?: boolean;
        models: Array<{id: string; label: string; capabilities: string[]}>}>>([]);
    const [bindings, setBindings] = useState<Record<string, {provider: string; model: string}>>({});
    const applyValues = (data: any) => {
        const models = data.models || {};
        setBindings(models);
        const modelValues: Record<string, string> = {};
        for (const field of getContentFeatures()) {
            modelValues[field.name] = models[field.name] ? JSON.stringify([models[field.name].provider, models[field.name].model]) : '';
        }
        form.setFieldsValue({features: data.features, models: modelValues});
    };
    const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
    const [error, setError] = useState(''), [reload, setReload] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError('');
        axios.get('/admin/api/smart-content', {signal: controller.signal}).then(response => {
            if (controller.signal.aborted) return;
            if (response.data.errno !== 0) throw new Error(i18n.t(response.data.errmsg || '') || i18n.t("读取设置失败"));
            applyValues(response.data.data);
            setProviders(response.data.data.providers || []);
        }).catch(error => {
            if (!controller.signal.aborted) setError(i18n.t(error.response?.data?.errmsg || '') || i18n.t(error.message || '') || i18n.t("读取设置失败"));
        }).finally(() => {if (!controller.signal.aborted) setLoading(false)});
        return () => controller.abort();
    }, [form, reload]);
    const save = async(values: {features: Record<string, boolean>; models: Record<string, string>}) => {
        const models: Record<string, {provider: string; model: string}> = {};
        for (const [key, value] of Object.entries(values.models || {})) {
            if (!value) continue;
            const [provider, model] = JSON.parse(value);
            models[key] = {provider, model};
        }
        setSaving(true);
        try {
            const response = await axios.post('/admin/api/smart-content', {features: values.features, models},
                {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}});
            if (response.data.errno !== 0) throw new Error(i18n.t(response.data.errmsg || '') || i18n.t("保存设置失败"));
            applyValues(response.data.data);
            message.success(i18n.t("智能内容设置已保存。"));
        } catch (error: any) { message.error(i18n.t(error.response?.data?.errmsg || '') || i18n.t(error.message || '') || i18n.t("保存设置失败")) }
        finally { setSaving(false) }
    };
    return <div className="fk-content-wrap ai-settings-page">
        <BreadCrumb {...props}/>
        <div className="page-list">
            <h3 className="page-title">{i18n.t("智能内容")}</h3>
            <p>{i18n.t("文章及启用功能所需的评论内容会发送到“AI 连接”中配置的服务。生成结果只写入编辑器，请审阅后再保存或发布。")}</p>
            {error ? <Alert type="error" showIcon title={error} action={<Button onClick={() => setReload(value => value + 1)}>{i18n.t("重试")}</Button>} />
                : <Spin spinning={loading}><Card title={i18n.t("功能与模型")}>
                    <Form form={form} layout="vertical" onFinish={save} disabled={loading || saving}>
                        {getContentFeatures().map(field => {
                            const capability = field.name === 'image' ? 'image' : 'text';
                            const groups = providers.filter(provider => provider.configured !== false).map(provider => ({
                                label: provider.label,
                                options: provider.models.filter(model => model.capabilities.includes(capability)).map(model => ({
                                    label: `${provider.label} / ${model.label}`, value: JSON.stringify([provider.id, model.id])
                                }))
                            })).filter(group => group.options.length);
                            const saved = bindings[field.name];
                            const savedValue = saved && JSON.stringify([saved.provider, saved.model]);
                            const unavailable = savedValue && !groups.some(group => group.options.some(option => option.value === savedValue));
                            return <div key={field.name} className="smart-content-feature">
                                <div className="smart-content-description">
                                    <h4 id={`feature-${field.name}`}>{field.label}</h4>
                                    <p id={`description-${field.name}`}>{field.description}</p>
                                </div>
                                <div className="smart-content-controls">
                                    <Form.Item name={['features', field.name]}
                                        valuePropName="checked"><Switch aria-labelledby={`feature-${field.name}`}
                                            aria-describedby={`description-${field.name}`} /></Form.Item>
                                    <Form.Item name={['models', field.name]} hidden={!enabledFeatures[field.name]}
                                        rules={[{validator: (_, value) => {
                                            const retainedWhileDisabled = !form.getFieldValue(['features', field.name]) && value === savedValue;
                                            const available = groups.some(group => group.options.some(option => option.value === value));
                                            return !value || retainedWhileDisabled || available ? Promise.resolve()
                                                : Promise.reject(new Error(i18n.t("请选择可用模型或恢复默认")));
                                        }}]}>
                                        <Select aria-label={i18n.t("{{value0}}使用的模型", {value0: field.label})} options={[
                                            {label: field.name === 'image' ? i18n.t("自动选择已配置的图片模型") : i18n.t("使用全局默认模型"), value: ''},
                                            ...(unavailable ? [{label: i18n.t("{{value0}} / {{value1}}（不可用，请重新选择）", {value0: saved.provider, value1: saved.model}), value: savedValue}] : []),
                                            ...groups
                                        ]} />
                                    </Form.Item>
                                </div>
                            </div>;
                        })}
                        <Button type="primary" htmlType="submit" disabled={loading} loading={saving}>{i18n.t("保存")}</Button>
                    </Form>
                </Card></Spin>}
        </div>
    </div>;
}
