import {useEffect, useState} from 'react';
import {Button, Input, message, Modal, Select, Space, Table, Tag} from 'antd';
import {Link} from '../../utils/router';
import {http} from '../../utils/http';
import BreadCrumb from '../../components/breadcrumb';

type Plugin = {id: string; name: string; version: string; description: string; author: string;
    authorUrl: string; source: string; status: string; reasons: string[]};

function safeUrl(url: string) {
    try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : undefined }
    catch { return undefined }
}

export default function PluginManagement(props: any) {
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [busy, setBusy] = useState(false);
    const load = () => http.get<{plugins: Plugin[]}>('/admin/api/marketplace').subscribe(res => {
        if (res.errno === 0) setPlugins(res.data.plugins);
    });
    useEffect(() => { const subscription = load(); return () => subscription.unsubscribe() }, []);
    const action = (plugin: Plugin, operation: string) => {
        const run = () => {
            setBusy(true);
            http.post<any>('/admin/api/marketplace', {operation, id: plugin.id, name: plugin.name},
                {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}}).subscribe({
                next: res => {
                    setBusy(false);
                    if (res.errno !== 0) return;
                    message.success(res.data?.restartRequired ? '操作已保存，请重启 Firekylin 后生效' : '操作已保存，请刷新页面查看状态');
                    load();
                }, error: () => setBusy(false)
            });
        };
        if (operation.includes('delete') || operation.includes('uninstall')) Modal.confirm({title: `删除 ${plugin.name}？`, onOk: run});
        else run();
    };
    const filtered = plugins.filter(item => item.name.toLowerCase().includes(search.trim().toLowerCase()) &&
        (status === 'all' || (status === 'active' ? item.status === 'active' : item.status !== 'active')));
    return <div className="plugin-management">
        <BreadCrumb {...props} />
        <div style={{padding: '0 20px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, margin: '20px 0'}}>
                <h3 style={{margin: 0}}>已安装插件</h3>
                <Space wrap><Select aria-label="插件状态" value={status} onChange={setStatus} style={{width: 120}}
                    options={[{value: 'all', label: '全部状态'}, {value: 'active', label: '已启用'}, {value: 'inactive', label: '未启用'}]} />
                    <Input.Search placeholder="搜索插件名称" value={search} onChange={e => setSearch(e.target.value)} style={{width: 200}} /></Space>
            </div>
            <Table rowKey="id" dataSource={filtered} pagination={false} columns={[
                {title: '名称', dataIndex: 'name', render: (name: string, item: Plugin) => <>{name} {item.status === 'active' && <Tag color="green">已启用</Tag>}</>},
                {title: '描述', render: (_: unknown, item: Plugin) => <div><div>{item.description}</div><small>
                    版本 {item.version} {item.author && <> | {safeUrl(item.authorUrl) ? <a href={safeUrl(item.authorUrl)} target="_blank" rel="noreferrer">@{item.author}</a> : `@${item.author}`}</>}
                    {item.source === 'npm' && <> | <a href={`https://www.npmjs.com/package/${encodeURIComponent(item.name)}`} target="_blank" rel="noreferrer">详情</a></>}
                </small></div>},
                {title: '操作', render: (_: unknown, item: Plugin) => {
                    const extension = (window.SysConfig.pluginAdmin || []).find(plugin => plugin.id === item.id);
                    const settings = extension?.pages.find(page => page.id === 'settings' || extension.forms.some(form => form.page === page.id));
                    return <Space wrap>{item.status === 'active' ? <>
                        {settings && <Link to={`/plugins/${encodeURIComponent(item.id)}/${encodeURIComponent(settings.id)}`}>设置</Link>}
                        <Button disabled={busy} onClick={() => action(item, 'plugin.disable')}>停用</Button>
                    </> : <>
                        {item.reasons.length ? <span>{item.reasons.join(', ')}</span> : <Button disabled={busy} type="primary" onClick={() => action(item, 'plugin.enable')}>启用</Button>}
                        <Button disabled={busy} danger onClick={() => action(item, item.source === 'npm' ? 'plugin.uninstall' : 'plugin.delete-local')}>删除</Button>
                    </>}</Space>;
                }}
            ]} />
        </div>
    </div>;
}
