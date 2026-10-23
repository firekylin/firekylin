import {useEffect, useState} from 'react';
import {Alert, Button, Card, Form, message, Spin, Switch} from 'antd';
import axios from 'axios';
import BreadCrumb from '../../../components/breadcrumb';
import {PAGE_SECTION_CONTENT_INSET} from '../../../components/protocol/page-section';

export const CONTENT_FEATURES = [
    {name: 'summary', label: '生成摘要', description: '正文超过 250 个字时，概括全文生成摘要并填入内容摘要，可继续编辑。'},
    {name: 'title', label: '生成标题', description: '正文超过 250 个字时，生成标题建议，支持编辑、重新生成和确认使用。'},
    {name: 'rewrite', label: '智能审阅', description: '正文超过 100 个字时，检查表达和结构，逐处展示差异与修改建议，支持接受、拒绝或手动合并。'},
    {name: 'translate', label: '翻译文章', description: '正文超过 10 个字时翻译全文，每次翻译时选择目标语言，并可同时翻译标题。'},
    {name: 'slug', label: '生成 Slug', description: '正文超过 250 个字时，生成可编辑的英文 URL 标识，使用时自动检查重名。'},
    {name: 'category', label: '智能分类', description: '正文超过 250 个字时，分别从已有分类和标签中选择适合文章的选项并回填。'},
    {name: 'autocomplete', label: '内容自动建议', description: '写作暂停时，在光标处提示后续内容；按 Tab 接受，继续输入或按 Esc 忽略。'},
];

export default function SmartContentSettings() {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
    const [error, setError] = useState(''), [reload, setReload] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError('');
        axios.get('/admin/api/smart-content', {signal: controller.signal}).then(response => {
            if (controller.signal.aborted) return;
            if (response.data.errno !== 0) throw new Error(response.data.errmsg || '读取设置失败');
            form.setFieldsValue(response.data.data.features);
        }).catch(error => {
            if (!controller.signal.aborted) setError(error.response?.data?.errmsg || error.message || '读取设置失败');
        }).finally(() => {if (!controller.signal.aborted) setLoading(false)});
        return () => controller.abort();
    }, [form, reload]);
    const save = async(features: Record<string, boolean>) => {
        setSaving(true);
        try {
            const response = await axios.post('/admin/api/smart-content', {features},
                {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}});
            if (response.data.errno !== 0) throw new Error(response.data.errmsg || '保存设置失败');
            form.setFieldsValue(response.data.data.features);
            message.success('智能内容设置已保存。');
        } catch (error: any) { message.error(error.response?.data?.errmsg || error.message || '保存设置失败') }
        finally { setSaving(false) }
    };
    return <div className="fk-content-wrap">
        <BreadCrumb />
        <div style={{marginInlineStart: PAGE_SECTION_CONTENT_INSET}}>
            <h3 className="page-title">智能内容</h3>
            <p>文章内容会发送到“AI 连接”中配置的服务。生成结果只写入编辑器，请审阅后再保存或发布。</p>
            {error ? <Alert type="error" showIcon title={error} action={<Button onClick={() => setReload(value => value + 1)}>重试</Button>} />
                : <Spin spinning={loading}><Card title="功能开关">
                    <Form form={form} layout="vertical" onFinish={save} disabled={loading || saving}>
                        {CONTENT_FEATURES.map(field => <Form.Item key={field.name} name={field.name} label={field.label}
                            valuePropName="checked" extra={field.description}><Switch /></Form.Item>)}
                        <Button type="primary" htmlType="submit" disabled={loading} loading={saving}>保存</Button>
                    </Form>
                </Card></Spin>}
        </div>
    </div>;
}
