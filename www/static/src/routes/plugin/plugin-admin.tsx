import * as React from 'react';
import { useEffect, useState } from 'react';
import { Alert, message, Modal, Space, Spin, Typography } from 'antd';
import { ActionGroup, hasLayoutReferences, PAGE_SECTION_CONTENT_INSET, PageForm, PageSections, PageSectionContext } from '../../components/protocol/page-section';
import { http } from '../../utils/http';
import BreadCrumb from '../../components/breadcrumb';

function extension(pluginId: string) {
    return (window.SysConfig.pluginAdmin || []).find(plugin => plugin.id === pluginId);
}

function PluginAdmin(props: any) {
    const {pluginId, pageId} = props.match.params;
    const search = props.location.search || '';
    const descriptor = extension(pluginId);
    const page = descriptor && descriptor.pages.find(item => item.id === pageId);
    const forms = descriptor ? descriptor.forms.filter(item => item.page === pageId) : [];
    const actions = descriptor ? descriptor.actions.filter(item => item.page === pageId) : [];
    const [content, setContent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [formValues, setFormValues] = useState<Record<string, any>>({});
    const [reloadKey, setReloadKey] = useState(0);
    const writeConfig = {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}};

    useEffect(() => {
        setContent(null);
        setFormValues({});
        setLoading(true);
        if (!descriptor || !page) {
            setLoading(false);
            return;
        }
        const subscriptions = [http.get<any>(`/admin/api/plugins/${pluginId}/pages/${pageId}`).subscribe(res => {
            if (res.errno === 0) setContent((res.data as any).content || {});
            setLoading(false);
        }), ...forms.map(item => http.get<any>(`/admin/api/plugins/${pluginId}/forms/${item.id}${search}`).subscribe(res => {
            if (res.errno === 0) setFormValues(values => ({...values, [item.id]: res.data || {}}));
        }))];
        return () => subscriptions.forEach(subscription => subscription.unsubscribe());
    }, [pluginId, pageId, search, reloadKey]);

    if (!descriptor || !page) return <Alert type="error" message="插件后台页面不存在或已停用" showIcon />;

    const submit = (formId: string, values: any) => http.post<any>(
        `/admin/api/plugins/${pluginId}/forms/${formId}`, values, writeConfig
    )
        .subscribe(res => {
            if (res.errno === 0) {
                message.success((res.data as any).message || '保存成功');
                setReloadKey(key => key + 1);
            }
        });
    const run = (action: any, input: Record<string, any> = {}) => {
        const execute = () => http.post<any>(
            `/admin/api/plugins/${pluginId}/actions/${action.id}`, input, writeConfig
        )
            .subscribe(res => {
                if (res.errno === 0) {
                    message.success((res.data as any).message || '操作成功');
                    setReloadKey(key => key + 1);
                }
            });
        action.confirm ? Modal.confirm({title: action.confirm, onOk: execute}) : execute();
    };

    const sections = content && content.sections || [];
    const explicitLayout = hasLayoutReferences(sections);
    const sectionContext: PageSectionContext = {forms, actions, formValues, submit, run};

    return <div className="fk-content-wrap">
        <BreadCrumb />
        <Space direction="vertical" size={4} style={{marginBottom: 20,
            marginInlineStart: PAGE_SECTION_CONTENT_INSET}}>
            <Typography.Title level={3} style={{margin: 0}}>{page.title}</Typography.Title>
            {page.description ? <Typography.Text type="secondary">{page.description}</Typography.Text> : null}
        </Space>
        {!explicitLayout ? <ActionGroup context={sectionContext} /> : null}
        <Spin spinning={loading}>
            {(content && content.notices || []).map((notice, index) =>
                <Alert key={index} style={{marginBottom: 16, marginInlineStart: PAGE_SECTION_CONTENT_INSET}}
                    type={notice.type || 'info'} message={notice.message} showIcon />
            )}
            <PageSections sections={sections} context={sectionContext} />
        </Spin>
        {!explicitLayout ? forms.map(item => <PageForm key={item.id} item={item}
            values={formValues[item.id]} submit={submit} />) : null}
    </div>;
}

export default PluginAdmin;
