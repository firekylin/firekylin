import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Alert, Button, message, Modal, Space, Spin, Typography } from 'antd';
import { ActionGroup, hasLayoutReferences, PAGE_SECTION_CONTENT_INSET, PageForm, PageSections, PageSectionContext } from '../../components/protocol/page-section';
import { http } from '../../utils/http';
import {Redirect} from '../../utils/router';
import BreadCrumb from '../../components/breadcrumb';

function PluginAdmin(props: any) {
    useTranslation('admin');
    const {pluginId, pageId} = props.match.params;
    const search = props.location.search || '';
    const [pageData, setPageData] = useState<any>(null);
    const [loadError, setLoadError] = useState('');
    const page = pageData?.page;
    const forms = pageData?.forms || [];
    const actions = pageData?.actions || [];
    const [content, setContent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [formValues, setFormValues] = useState<Record<string, any>>({});
    const [reloadKey, setReloadKey] = useState(0);
    const writeConfig = {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}};

    useEffect(() => {
        setContent(null);
        setFormValues({});
        setLoading(true);
        setPageData(null);
        setLoadError('');
        const query = new URLSearchParams(search);
        query.set('includeForms', '1');
        const subscription = http.get<any>(`/admin/api/plugins/${pluginId}/pages/${pageId}?${query}`).subscribe({
            next: res => {
                if (res.errno === 0) {
                    setPageData(res.data);
                    setContent(res.data.content || {});
                    setFormValues(res.data.formValues || {});
                } else {
                    setLoadError(res.errmsg || i18n.t("插件后台页面不存在或已停用"));
                }
                setLoading(false);
            },
            error: error => {
                setLoadError(error.message || i18n.t("插件后台页面不存在或已停用"));
                setLoading(false);
            }
        });
        return () => subscription.unsubscribe();
    }, [pluginId, pageId, search, reloadKey]);

    if (pluginId === 'ai-content' && pageId === 'settings' && props.location.pathname.includes('/plugins/')) {
        return <Redirect to="/options/smart-content" />;
    }
    if (loadError) return <Alert type="error" message={loadError} showIcon
        action={<Button onClick={() => setReloadKey(key => key + 1)}>{i18n.t("重试")}</Button>} />;
    if (!page) return <Spin spinning={loading} />;

    const submit = (formId: string, values: any) => http.post<any>(
        `/admin/api/plugins/${pluginId}/forms/${formId}`, values, writeConfig
    )
        .subscribe(res => {
            if (res.errno === 0) {
                message.success(i18n.t((res.data as any).message || '') || i18n.t("保存成功"));
                setReloadKey(key => key + 1);
            }
        });
    const run = (action: any, input: Record<string, any> = {}) => {
        const execute = () => http.post<any>(
            `/admin/api/plugins/${pluginId}/actions/${action.id}`, input, writeConfig
        )
            .subscribe(res => {
                if (res.errno === 0) {
                    message.success(i18n.t((res.data as any).message || '') || i18n.t("操作成功"));
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
