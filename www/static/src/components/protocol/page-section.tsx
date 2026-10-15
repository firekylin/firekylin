import * as React from 'react';
import { Alert, Button, Card, Descriptions, Divider, Dropdown, Empty, Form, Image, Input, List, Progress, Space, Statistic, Table, Tabs, Typography } from 'antd';
import { FormField, FormFieldSchema } from './form-field';
import { ProtocolList, ProtocolNode, ProtocolRenderer, ProtocolRendererMap } from './renderer';

export interface PageSection extends ProtocolNode {
    [key: string]: any;
}

export interface PageSectionContext {
    forms: any[];
    actions: any[];
    formValues: Record<string, any>;
    submit: (id: string, values: any) => void;
    run: (action: any, input?: Record<string, any>) => void;
}

export const PAGE_SECTION_CONTENT_INSET = 24;

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

function card(node: PageSection, children: React.ReactNode, extra?: React.ReactNode) {
    return <Card title={node.title} extra={extra} style={{marginBottom: 16}}>{children}</Card>;
}

function TableAction({item, context}: {item: any; context: PageSectionContext}) {
    const type = item.type === 'primary' ? 'primary' : 'link';
    if (item.href) {
        const href = safeUrl(item.href);
        return href ? <Button type={type} danger={item.type === 'danger'} disabled={item.disabled}
            href={href}>{item.label}</Button> : null;
    }
    const action = context.actions.find(candidate => candidate.id === item.action);
    return action ? <Button type={type} danger={item.type === 'danger' || action.type === 'danger'}
        disabled={item.disabled} onClick={() => context.run(action, item.input || {})}>{item.label || action.label}</Button> : null;
}

function TableActions({items, context}: {items: any[]; context: PageSectionContext}) {
    return <Space>{(items || []).map((item, index) => <TableAction key={index} item={item} context={context} />)}</Space>;
}

function TableSection({node, context}: {node: PageSection; context: PageSectionContext}) {
    const [keyword, setKeyword] = React.useState('');
    const [selectedRowKeys, setSelectedRowKeys] = React.useState<React.Key[]>([]);
    const search = node.search && typeof node.search === 'object' ? node.search : node.search ? {} : null;
    const selection = node.selection && typeof node.selection === 'object' ? node.selection : null;
    const searchableKeys = search && Array.isArray(search.keys) && search.keys.length
        ? search.keys : (node.columns || []).filter(column => column.type !== 'actions').map(column => column.key);
    const normalizedKeyword = keyword.trim().toLocaleLowerCase();
    const rows = normalizedKeyword ? (node.rows || []).filter(row => searchableKeys.some(key =>
        String(row[key] == null ? '' : row[key]).toLocaleLowerCase().includes(normalizedKeyword)
    )) : node.rows || [];
    const bulkActions = selection ? (selection.actions || []).map((item: any, index: number) => ({
        ...item, menuKey: item.key || `${item.action}-${index}`
    })) : [];
    const bulkItems = bulkActions.map((item: any) => ({
        key: item.menuKey,
        label: item.label || context.actions.find(action => action.id === item.action)?.label || item.action,
        danger: item.type === 'danger' || context.actions.find(action => action.id === item.action)?.type === 'danger'
    }));
    const runBulkAction = ({key}: {key: string}) => {
        const item = bulkActions.find((candidate: any) => candidate.menuKey === key);
        const action = context.actions.find(candidate => candidate.id === item?.action);
        if (!item || !action || !selectedRowKeys.length) return;
        context.run(action, {...(item.input || {}), [selection.input || 'ids']: selectedRowKeys.join(',')});
        setSelectedRowKeys([]);
    };
    const controls = search || selection || node.toolbar ? <Space wrap>
        {search ? <Input.Search allowClear value={keyword} placeholder={search.placeholder || '搜索'}
            onChange={event => setKeyword(event.target.value)} style={{width: search.width || 240}} /> : null}
        {selection ? <Dropdown menu={{items: bulkItems, onClick: runBulkAction}} disabled={!selectedRowKeys.length}>
            <Button>批量操作{selectedRowKeys.length ? `（${selectedRowKeys.length}）` : ''}</Button>
        </Dropdown> : null}
        {node.toolbar ? <TableActions items={node.toolbar} context={context} /> : null}
    </Space> : undefined;
    return card(node, <Table pagination={node.pagination ? undefined : false}
        rowSelection={selection ? {selectedRowKeys, onChange: setSelectedRowKeys} : undefined}
        rowKey={node.rowKey || 'id'} columns={(node.columns || []).map(column => ({
            title: column.title, dataIndex: column.key, key: column.key,
            render: column.type === 'actions' ? (items: any[]) => <TableActions items={items} context={context} /> : undefined
        }))} dataSource={rows} />, controls);
}

function PluginForm({item, values, submit}: {item: any; values: any; submit: PageSectionContext['submit']}) {
    return <Card title={item.title} style={{marginBottom: 16}}>
        <Form layout="vertical" initialValues={values} key={JSON.stringify(values || {})}
            onFinish={formValues => submit(item.id, formValues)}>
            {item.fields.map((field: FormFieldSchema) => <Form.Item key={field.name} name={field.name} label={field.label}
                hidden={field.type === 'hidden'}
                valuePropName={field.type === 'switch' ? 'checked' : 'value'}
                extra={field.description} rules={[{required: field.required, message: `请填写${field.label}`}]}>
                <FormField field={field} />
            </Form.Item>)}
            <Button type="primary" htmlType="submit">{item.submitLabel}</Button>
        </Form>
    </Card>;
}

export function ActionGroup({ids, context}: {ids?: string[]; context: PageSectionContext}) {
    const selected = ids ? context.actions.filter(action => ids.includes(action.id)) : context.actions;
    return selected.length ? <Space style={{display: 'flex', marginBottom: 16,
        marginInlineStart: PAGE_SECTION_CONTENT_INSET}}>
        {selected.map(action => <Button key={action.id} type={action.type === 'primary' ? 'primary' : 'default'}
            danger={action.type === 'danger'} onClick={() => context.run(action)}>{action.label}</Button>)}
    </Space> : null;
}

const pageSectionRenderers: ProtocolRendererMap<PageSection, PageSectionContext> = {
    text: ({node}) => card(node, <Typography.Paragraph style={{whiteSpace: 'pre-wrap'}}>{node.content}</Typography.Paragraph>),
    description: ({node}) => card(node, <Descriptions column={node.columns || 1}
        items={(node.items || []).map((item, index) => ({
            key: index, label: item.label, children: String(item.value == null ? '' : item.value)
        }))} />),
    table: ({node, context}) => <TableSection node={node} context={context} />,
    stat: ({node}) => card(node, <div style={{display: 'grid', gap: 24,
        gridTemplateColumns: `repeat(${Math.max(1, Math.min(4, node.columns || 3))}, minmax(0, 1fr))`}}>
        {(node.items || []).map((item, index) => <Statistic key={index} title={item.label} value={item.value}
            prefix={item.prefix} suffix={item.suffix} precision={item.precision} />)}
    </div>),
    list: ({node}) => card(node, <List dataSource={node.items || []} renderItem={(item: any) =>
        <List.Item><List.Item.Meta title={item.title || String(item)} description={item.description} /></List.Item>} />),
    markdown: ({node}) => card(node, <Markdown content={node.content} />),
    image: ({node}) => card(node, safeImageUrl(node.src)
        ? <Image src={safeImageUrl(node.src)} alt={node.alt || ''} width={node.width} />
        : <Alert type="warning" message="图片地址无效" showIcon />),
    progress: ({node}) => card(node, <Progress percent={Math.max(0, Math.min(100, node.percent || 0))}
        status={node.status} format={node.label ? () => node.label : undefined} />),
    empty: ({node}) => <Empty style={{marginBottom: 16, marginInlineStart: PAGE_SECTION_CONTENT_INSET}}
        description={node.description} />,
    divider: ({node}) => <Divider style={{width: 'auto', minWidth: 0,
        marginInlineStart: PAGE_SECTION_CONTENT_INSET}}>{node.title}</Divider>,
    links: ({node}) => card(node, <List dataSource={node.items || []} renderItem={(item: any) =>
        <List.Item><List.Item.Meta title={safeUrl(item.href)
            ? <a href={safeUrl(item.href)} target="_blank" rel="noreferrer">{item.label}</a> : item.label}
            description={item.description} /></List.Item>} />),
    code: ({node}) => card(node, <Typography.Paragraph><pre style={{overflow: 'auto'}}><code>
        {String(node.content || '')}
    </code></pre></Typography.Paragraph>),
    grid: ({node, context}) => <div style={{display: 'grid', gap: 16,
        gridTemplateColumns: `repeat(${Math.max(1, Math.min(4, node.columns || 2))}, minmax(0, 1fr))`}}>
        <ProtocolList nodes={node.items || []} context={context} renderers={pageSectionRenderers} />
    </div>,
    tabs: ({node, context}) => <Tabs items={(node.items || []).map(tab => ({
        key: tab.key,
        label: tab.label,
        children: <ProtocolList nodes={tab.sections || []} context={context} renderers={pageSectionRenderers} />
    }))} />,
    form: ({node, context}) => {
        const item = context.forms.find(form => form.id === node.id);
        return item ? <PluginForm item={item} values={context.formValues[item.id]} submit={context.submit} /> : null;
    },
    actions: ({node, context}) => <ActionGroup ids={node.ids} context={context} />
};

export function PageSectionRenderer({section, context}: {section: PageSection; context: PageSectionContext}) {
    return <ProtocolRenderer node={section} context={context} renderers={pageSectionRenderers} />;
}

export function PageSections({sections, context}: {sections: PageSection[]; context: PageSectionContext}) {
    return <ProtocolList nodes={sections} context={context} renderers={pageSectionRenderers} />;
}

export function PageForm({item, values, submit}: {item: any; values: any; submit: PageSectionContext['submit']}) {
    return <PluginForm item={item} values={values} submit={submit} />;
}

export function hasLayoutReferences(sections: PageSection[]): boolean {
    return (sections || []).some(section => ['form', 'actions'].includes(section.type) ||
        (section.type === 'grid' && hasLayoutReferences(section.items)) ||
        (section.type === 'tabs' && (section.items || []).some(tab => hasLayoutReferences(tab.sections))));
}
