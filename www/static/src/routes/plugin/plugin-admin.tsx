import * as React from 'react';
import { useEffect, useState } from 'react';
import { Alert, message, Modal, Space, Spin, Typography } from 'antd';
import { ActionGroup, hasLayoutReferences, PageForm, PageSections, PageSectionContext } from '../../components/protocol/page-section';
import { http } from '../../utils/http';
import { useRouteComponentProps } from '../../utils/router';

function extension(pluginId: string) {
    return (window.SysConfig.pluginAdmin || []).find(plugin => plugin.id === pluginId);
}

function PluginAdmin(props: any) {
    const {pluginId, pageId} = props.match.params;
    const descriptor = extension(pluginId);
    const page = descriptor && descriptor.pages.find(item => item.id === pageId);
    const forms = descriptor ? descriptor.forms.filter(item => item.page === pageId) : [];
    const actions = descriptor ? descriptor.actions.filter(item => item.page === pageId) : [];
    const [content, setContent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [formValues, setFormValues] = useState<Record<string, any>>({});
    const writeConfig = {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}};

    const reload = () => {
        setLoading(true);
        http.get<any>(`/admin/api/plugins/${pluginId}/pages/${pageId}`).subscribe(res => {
            if (res.errno === 0) setContent((res.data as any).content || {});
            setLoading(false);
        });
        forms.forEach(item => http.get<any>(`/admin/api/plugins/${pluginId}/forms/${item.id}`).subscribe(res => {
            if (res.errno === 0) setFormValues(values => ({...values, [item.id]: res.data || {}}));
        }));
    };

    useEffect(reload, [pluginId, pageId]);
    if (!descriptor || !page) return <Alert type="error" message="插件后台页面不存在或已停用" showIcon />;

    const submit = (formId: string, values: any) => http.post<any>(
        `/admin/api/plugins/${pluginId}/forms/${formId}`, values, writeConfig
    )
        .subscribe(res => {
            if (res.errno === 0) {
                message.success((res.data as any).message || '保存成功');
                reload();
            }
        });
    const run = (action: any) => {
        const execute = () => http.post<any>(
            `/admin/api/plugins/${pluginId}/actions/${action.id}`, {}, writeConfig
        )
            .subscribe(res => {
                if (res.errno === 0) {
                    message.success((res.data as any).message || '操作成功');
                    reload();
                }
            });
        action.confirm ? Modal.confirm({title: action.confirm, onOk: execute}) : execute();
    };

    const sections = content && content.sections || [];
    const explicitLayout = hasLayoutReferences(sections);
    const sectionContext: PageSectionContext = {forms, actions, formValues, submit, run};

    return <div className="fk-content-wrap">
        <Space direction="vertical" size={4} style={{marginBottom: 20}}>
            <Typography.Title level={3} style={{margin: 0}}>{page.title}</Typography.Title>
            {page.description ? <Typography.Text type="secondary">{page.description}</Typography.Text> : null}
        </Space>
        {!explicitLayout ? <ActionGroup context={sectionContext} /> : null}
        <Spin spinning={loading}>
            {(content && content.notices || []).map((notice, index) =>
                <Alert key={index} style={{marginBottom: 16}} type={notice.type || 'info'} message={notice.message} showIcon />
            )}
            <PageSections sections={sections} context={sectionContext} />
        </Spin>
        {!explicitLayout ? forms.map(item => <PageForm key={item.id} item={item}
            values={formValues[item.id]} submit={submit} />) : null}
    </div>;
}

export default function PluginAdminWithRouter() {
    return <PluginAdmin {...useRouteComponentProps()} />;
}
