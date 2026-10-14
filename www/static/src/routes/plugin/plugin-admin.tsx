import * as React from 'react';
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Divider, Empty, Form, Image, Input, InputNumber, List, message, Modal, Progress, Select, Space, Spin, Statistic, Switch, Table, Typography } from 'antd';
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

function safeUrl(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    if (value.startsWith('/') && !value.startsWith('//')) return value;
    try {
        const url = new URL(value);
        return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? value : undefined;
    } catch {
        return undefined;
    }
}

function safeImageUrl(value: unknown): string | undefined {
    const url = safeUrl(value);
    return url && !url.startsWith('mailto:') ? url : undefined;
}

function InlineMarkdown({children}: {children: string}) {
    const tokens = children.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
    return <>{tokens.map((token, index) => {
        if (token.startsWith('`') && token.endsWith('`')) return <Typography.Text code key={index}>{token.slice(1, -1)}</Typography.Text>;
        if (token.startsWith('**') && token.endsWith('**')) return <Typography.Text strong key={index}>{token.slice(2, -2)}</Typography.Text>;
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
        if (link) return safeUrl(link[2]) ? <a key={index} href={safeUrl(link[2])} target="_blank" rel="noreferrer">{link[1]}</a> : link[1];
        return token;
    })}</>;
}

function Markdown({content}: {content: string}) {
    const lines = String(content || '').split('\n');
    return <div>{lines.map((line, index) => {
        const heading = /^(#{1,3})\s+(.+)$/.exec(line);
        if (heading) return <Typography.Title key={index} level={(heading[1].length + 2) as 3 | 4 | 5}>
            <InlineMarkdown>{heading[2]}</InlineMarkdown>
        </Typography.Title>;
        if (/^[-*]\s+/.test(line)) return <div key={index}>• <InlineMarkdown>{line.replace(/^[-*]\s+/, '')}</InlineMarkdown></div>;
        return line ? <Typography.Paragraph key={index}><InlineMarkdown>{line}</InlineMarkdown></Typography.Paragraph> : <br key={index} />;
    })}</div>;
}

function FormField({field}: {field: Field}) {
    if (field.type === 'textarea') return <Input.TextArea rows={5} placeholder={field.placeholder} />;
    if (field.type === 'number') return <InputNumber style={{width: '100%'}} placeholder={field.placeholder} />;
    if (field.type === 'switch') return <Switch />;
    if (field.type === 'select') return <Select options={field.options} placeholder={field.placeholder} />;
    return <Input type={field.type === 'password' ? 'password' : 'text'} placeholder={field.placeholder} />;
}

function PluginForm({item, values, submit}: {item: any; values: any; submit: (id: string, values: any) => void}) {
    return <Card title={item.title} style={{marginBottom: 16}}>
        <Form layout="vertical" initialValues={values} key={JSON.stringify(values || {})}
            onFinish={formValues => submit(item.id, formValues)}>
            {item.fields.map((field: Field) => <Form.Item key={field.name} name={field.name} label={field.label}
                valuePropName={field.type === 'switch' ? 'checked' : 'value'}
                extra={field.description} rules={[{required: field.required, message: `请填写${field.label}`}]}>
                <FormField field={field} />
            </Form.Item>)}
            <Button type="primary" htmlType="submit">{item.submitLabel}</Button>
        </Form>
    </Card>;
}

function hasLayoutReferences(sections: any[]): boolean {
    return (sections || []).some(section => ['form', 'actions'].includes(section.type) ||
        (section.type === 'grid' && hasLayoutReferences(section.items)));
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

    const actionBar = (ids?: string[]) => {
        const selected = ids ? actions.filter(action => ids.includes(action.id)) : actions;
        return selected.length ? <Space style={{display: 'flex', marginBottom: 16}}>
            {selected.map(action => <Button key={action.id} type={action.type === 'primary' ? 'primary' : 'default'}
                danger={action.type === 'danger'} onClick={() => run(action)}>{action.label}</Button>)}
        </Space> : null;
    };
    const renderSection = (section: any, key: React.Key): React.ReactNode => {
        const card = (children: React.ReactNode) => <Card key={key} title={section.title} style={{marginBottom: 16}}>{children}</Card>;
        if (section.type === 'form') {
            const item = forms.find(form => form.id === section.id);
            return item ? <PluginForm key={key} item={item} values={formValues[item.id]} submit={submit} /> : null;
        }
        if (section.type === 'actions') return <React.Fragment key={key}>{actionBar(section.ids)}</React.Fragment>;
        if (section.type === 'grid') return <div key={key} style={{display: 'grid', gap: 16,
            gridTemplateColumns: `repeat(${Math.max(1, Math.min(4, section.columns || 2))}, minmax(0, 1fr))`}}>
            {(section.items || []).map((item, index) => renderSection(item, `${key}-${index}`))}
        </div>;
        if (section.type === 'table') return card(<Table pagination={section.pagination ? undefined : false}
            rowKey={section.rowKey || 'id'} columns={(section.columns || []).map(column => ({
                title: column.title, dataIndex: column.key, key: column.key
            }))} dataSource={section.rows || []} />);
        if (section.type === 'description') return card(<Descriptions column={section.columns || 1}
            items={(section.items || []).map((item, index) => ({
                key: index, label: item.label, children: String(item.value == null ? '' : item.value)
            }))} />);
        if (section.type === 'stat') return card(<div style={{display: 'grid', gap: 24,
            gridTemplateColumns: `repeat(${Math.max(1, Math.min(4, section.columns || 3))}, minmax(0, 1fr))`}}>
            {(section.items || []).map((item, index) => <Statistic key={index} title={item.label} value={item.value}
                prefix={item.prefix} suffix={item.suffix} precision={item.precision} />)}
        </div>);
        if (section.type === 'list') return card(<List dataSource={section.items || []} renderItem={(item: any) =>
            <List.Item><List.Item.Meta title={item.title || String(item)} description={item.description} /></List.Item>} />);
        if (section.type === 'markdown') return card(<Markdown content={section.content} />);
        if (section.type === 'image') return card(safeImageUrl(section.src)
            ? <Image src={safeImageUrl(section.src)} alt={section.alt || ''} width={section.width} />
            : <Alert type="warning" message="图片地址无效" showIcon />);
        if (section.type === 'progress') return card(<Progress percent={Math.max(0, Math.min(100, section.percent || 0))}
            status={section.status} format={section.label ? () => section.label : undefined} />);
        if (section.type === 'empty') return <Empty key={key} style={{marginBottom: 16}} description={section.description} />;
        if (section.type === 'divider') return <Divider key={key}>{section.title}</Divider>;
        if (section.type === 'links') return card(<List dataSource={section.items || []} renderItem={(item: any) =>
            <List.Item><List.Item.Meta title={safeUrl(item.href)
                ? <a href={safeUrl(item.href)} target="_blank" rel="noreferrer">{item.label}</a> : item.label}
                description={item.description} /></List.Item>} />);
        if (section.type === 'code') return card(<Typography.Paragraph><pre style={{overflow: 'auto'}}><code>
            {String(section.content || '')}
        </code></pre></Typography.Paragraph>);
        return card(<Typography.Paragraph style={{whiteSpace: 'pre-wrap'}}>{section.content}</Typography.Paragraph>);
    };

    const sections = content && content.sections || [];
    const explicitLayout = hasLayoutReferences(sections);

    return <div className="fk-content-wrap">
        <Space direction="vertical" size={4} style={{marginBottom: 20}}>
            <Typography.Title level={3} style={{margin: 0}}>{page.title}</Typography.Title>
            {page.description ? <Typography.Text type="secondary">{page.description}</Typography.Text> : null}
        </Space>
        {!explicitLayout ? actionBar() : null}
        <Spin spinning={loading}>
            {(content && content.notices || []).map((notice, index) =>
                <Alert key={index} style={{marginBottom: 16}} type={notice.type || 'info'} message={notice.message} showIcon />
            )}
            {sections.map((section, index) => renderSection(section, index))}
        </Spin>
        {!explicitLayout ? forms.map(item => <PluginForm key={item.id} item={item}
            values={formValues[item.id]} submit={submit} />) : null}
    </div>;
}

export default function PluginAdminWithRouter() {
    return <PluginAdmin {...useRouteComponentProps()} />;
}
