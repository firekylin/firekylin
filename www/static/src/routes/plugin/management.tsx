import {useEffect, useRef, useState} from 'react';
import {Subscription} from 'rxjs';
import {Button, Input, message, Modal, Select, Space, Table, Tag} from 'antd';
import {Link} from '../../utils/router';
import {http} from '../../utils/http';
import BreadCrumb from '../../components/breadcrumb';
import './management.less';

type Plugin = {id: string; name: string; version: string; description: string; author: string;
    authorUrl: string; source: string; status: string; reasons: string[]};

function npmUrl(name: string) {
    return /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/i.test(name)
        ? `https://www.npmjs.com/package/${encodeURIComponent(name)}` : undefined;
}

function safeUrl(url: string) {
    try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : undefined }
    catch { return undefined }
}

export default function PluginManagement(props: any) {
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [busy, setBusy] = useState(false);
    const requests = useRef(new Subscription());
    const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const load = (done?: (items: Plugin[]) => void) => {
        const subscription = http.get<{plugins: Plugin[]; pluginAdmin?: typeof window.SysConfig.pluginAdmin}>(
            '/admin/api/marketplace').subscribe({next: res => {
            if (res.errno === 0 && res.data) {
                setPlugins(res.data.plugins);
                if (res.data.pluginAdmin) window.SysConfig.pluginAdmin = res.data.pluginAdmin;
                done?.(res.data.plugins);
            } else done?.([]);
        }, error: () => done?.([])});
        requests.current.add(subscription);
    };
    useEffect(() => {
        requests.current = new Subscription();
        load();
        return () => { requests.current.unsubscribe(); clearTimeout(retryTimer.current) };
    }, []);
    const action = (plugin: Plugin, operation: string) => {
        const run = () => {
            setBusy(true);
            const subscription = http.post<any>('/admin/api/marketplace', {operation, id: plugin.id, name: plugin.name},
                {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}}).subscribe({
                next: res => {
                    if (res.errno !== 0) { setBusy(false); return }
                    if (res.data?.status === 'created') {
                        setBusy(false);
                        Modal.info({title: '已创建 GitHub 更新 PR', content: <span>请查看 <a target="_blank" rel="noreferrer"
                            href={res.data.url}>GitHub PR</a>；合并并部署后生效。</span>});
                        return;
                    }
                    const stateChange = operation === 'plugin.enable' || operation === 'plugin.disable';
                    if (!stateChange || res.data?.restartRequired) {
                        load(() => setBusy(false));
                        message.success(res.data?.restartRequired ? '操作已保存，请重启 Firekylin 后生效' : '操作成功');
                        return;
                    }
                    let attempts = 0;
                    const refresh = () => load(items => {
                        const current = items.find(item => item.id === plugin.id);
                        const updated = operation === 'plugin.enable' ? current?.status === 'active' : current?.status === 'inactive';
                        if (updated) { setBusy(false); message.success('操作成功'); return }
                        if (current?.status === 'error' || ++attempts >= 20) {
                            setBusy(false);
                            message.warning(current?.status === 'error' ? '插件启动失败，请查看错误信息' : '状态尚未更新，请稍后刷新');
                            return;
                        }
                        retryTimer.current = setTimeout(refresh, 500);
                    });
                    refresh();
                }, error: () => setBusy(false)
            });
            requests.current.add(subscription);
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
                    <Input.Search placeholder="搜索插件名称" value={search} onChange={e => setSearch(e.target.value)} style={{width: 200}} />
                    <Button type="primary" onClick={() => props.history.push('/plugin-management/install')}>安装插件</Button></Space>
            </div>
            <Table rowKey="id" dataSource={filtered} pagination={false} columns={[
                {title: '名称', dataIndex: 'name', render: (name: string, item: Plugin) => <>{name} {item.status === 'active' && <Tag color="green">已启用</Tag>}</>},
                {title: '描述', render: (_: unknown, item: Plugin) => <div><div>{item.description}</div><small>
                    版本 {item.version} {item.author && <> | {safeUrl(item.authorUrl) ? <a href={safeUrl(item.authorUrl)} target="_blank" rel="noreferrer">@{item.author}</a> : `@${item.author}`}</>}
                    {npmUrl(item.name) && <> | <a href={npmUrl(item.name)} target="_blank" rel="noreferrer">查看详情</a></>}
                </small></div>},
                {title: '操作', render: (_: unknown, item: Plugin) => {
                    const extension = (window.SysConfig.pluginAdmin || []).find(plugin => plugin.id === item.id);
                    const settings = extension?.pages.find(page => page.id === 'settings' && !page.panel);
                    return <Space wrap separator={<span aria-hidden="true">|</span>}>{item.status === 'active' ? <>
                        {settings && <Link style={{color: '#1677ff'}}
                            to={`/plugins/${encodeURIComponent(item.id)}/${encodeURIComponent(settings.id)}`}>配置</Link>}
                        <button className="plugin-action plugin-action-disable" disabled={busy} onClick={() => action(item, 'plugin.disable')}>停用</button>
                    </> : <>
                        {item.reasons.length ? <span>{item.reasons.join(', ')}</span> : <button className="plugin-action plugin-action-enable" disabled={busy} onClick={() => action(item, 'plugin.enable')}>启用</button>}
                        <button className="plugin-action plugin-action-delete" disabled={busy} onClick={() => action(item, item.source === 'npm' ? 'plugin.uninstall' : 'plugin.delete-local')}>删除</button>
                    </>}</Space>;
                }}
            ]} />
        </div>
    </div>;
}
