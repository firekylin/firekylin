import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Descriptions, Form, Input, InputNumber, message, Modal, Select, Space, Spin, Switch, Table, Typography } from 'antd';
import { http } from '../../utils/http';
import { useRouteComponentProps } from '../../utils/router';

type Field = {
    name: string;
    type: 'text' | 'textarea' | 'number' | 'switch' | 'select' | 'password';
    label: string;
    description?: string;
    placeholder?: string;
    required?: boolean;
    options?: Array<{label: string; value: any}>;
};

function extension(pluginId: string) {
    return (window.SysConfig.pluginAdmin || []).find(plugin => plugin.id === pluginId);
}

function PageContent({content}: {content: any}) {
    return <>
        {(content.notices || []).map((notice, index) =>
            <Alert key={index} style={{marginBottom: 16}} type={notice.type || 'info'} message={notice.message} showIcon />
        )}
        {(content.sections || []).map((section, index) => {
            if (section.type === 'table') return <Card key={index} title={section.title} style={{marginBottom: 16}}>
                <Table pagination={false} rowKey={section.rowKey || 'id'} columns={(section.columns || []).map(column => ({
                    title: column.title, dataIndex: column.key, key: column.key
                }))} dataSource={section.rows || []} />
            </Card>;
            if (section.type === 'description') return <Card key={index} title={section.title} style={{marginBottom: 16}}>
                <Descriptions column={1} items={(section.items || []).map((item, itemIndex) => ({
                    key: itemIndex, label: item.label, children: String(item.value == null ? '' : item.value)
                }))} />
            </Card>;
            return <Card key={index} title={section.title} style={{marginBottom: 16}}>
                <Typography.Paragraph style={{whiteSpace: 'pre-wrap'}}>{section.content}</Typography.Paragraph>
            </Card>;
        })}
    </>;
}

function FormField({field}: {field: Field}) {
    if (field.type === 'textarea') return <Input.TextArea rows={5} placeholder={field.placeholder} />;
    if (field.type === 'number') return <InputNumber style={{width: '100%'}} placeholder={field.placeholder} />;
    if (field.type === 'switch') return <Switch />;
    if (field.type === 'select') return <Select options={field.options} placeholder={field.placeholder} />;
    return <Input type={field.type === 'password' ? 'password' : 'text'} placeholder={field.placeholder} />;
}

function PluginAdmin(props: any) {
    const {pluginId, pageId} = props.match.params;
    const descriptor = useMemo(() => extension(pluginId), [pluginId]);
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

    return <div className="fk-content-wrap">
        <Space direction="vertical" size={4} style={{marginBottom: 20}}>
            <Typography.Title level={3} style={{margin: 0}}>{page.title}</Typography.Title>
            {page.description ? <Typography.Text type="secondary">{page.description}</Typography.Text> : null}
        </Space>
        {actions.length ? <Space style={{display: 'flex', marginBottom: 16}}>
            {actions.map(action => <Button key={action.id} type={action.type === 'primary' ? 'primary' : 'default'}
                danger={action.type === 'danger'} onClick={() => run(action)}>{action.label}</Button>)}
        </Space> : null}
        <Spin spinning={loading}><PageContent content={content || {}} /></Spin>
        {forms.map(item => <Card key={item.id} title={item.title} style={{marginBottom: 16}}>
            <Form layout="vertical" initialValues={formValues[item.id]} key={JSON.stringify(formValues[item.id] || {})}
                onFinish={values => submit(item.id, values)}>
                {item.fields.map((field: Field) => <Form.Item key={field.name} name={field.name} label={field.label}
                    valuePropName={field.type === 'switch' ? 'checked' : 'value'}
                    extra={field.description} rules={[{required: field.required, message: `请填写${field.label}`}]}>
                    <FormField field={field} />
                </Form.Item>)}
                <Button type="primary" htmlType="submit">{item.submitLabel}</Button>
            </Form>
        </Card>)}
    </div>;
}

export default function PluginAdminWithRouter() {
    return <PluginAdmin {...useRouteComponentProps()} />;
}
