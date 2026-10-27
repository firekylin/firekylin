import {useEffect, useState} from 'react';
import {Alert, Button, Input, message, Modal, Space, Spin, Table, Tag} from 'antd';
import axios from 'axios';
import {gt, valid} from 'semver';
import {Link} from '../../utils/router';
import BreadCrumb from '../../components/breadcrumb';

type InstalledPlugin = {name: string; version: string; source: string};

type MarketItem = {name: string; version: string; title?: string; description?: string};

export default function PluginMarket(props: any) {
    const [items, setItems] = useState<MarketItem[]>([]);
    const [installed, setInstalled] = useState<InstalledPlugin[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError('');
        Promise.all([
            axios.get('/admin/api/extension-settings?type=plugin', {signal: controller.signal}),
            axios.get('/admin/api/marketplace', {signal: controller.signal})
        ]).then(([registry, catalog]) => {
            if (registry.data.errno !== 0 || catalog.data.errno !== 0) throw new Error('读取插件市场失败');
            setItems(registry.data.data.items);
            setInstalled(catalog.data.data.plugins);
        }).catch(reason => {
            if (!controller.signal.aborted) setError(reason.response?.data?.errmsg || reason.message || '读取插件市场失败');
        }).finally(() => { if (!controller.signal.aborted) setLoading(false) });
        return () => controller.abort();
    }, [reload]);
    const install = (item: MarketItem, updating = false) => Modal.confirm({title: `${updating ? '更新' : '安装'} ${item.title || item.name}？`,
        content: `版本 ${item.version}。本地安装后需要重启；GitHub 管理需要等待仓库 PR 合并。`,
        onOk: async() => {
            setBusy(true);
            try {
                const result = await axios.post('/admin/api/marketplace', {
                    operation: updating ? 'plugin.update-registry' : 'plugin.install-registry', name: item.name, version: item.version
                }, {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}});
                if (result.data.errno !== 0) throw new Error(result.data.errmsg || '安装失败');
                if (result.data.data?.status === 'created') {
                    Modal.info({title: '已创建 GitHub 更新 PR', content: <span>请查看 <a target="_blank" rel="noreferrer"
                        href={result.data.data.url}>GitHub PR</a>；合并并部署后生效。</span>});
                } else {
                    message.success(updating ? '更新完成，请重启 Firekylin 后生效' : '安装完成，请重启 Firekylin 后启用插件');
                    setReload(value => value + 1);
                }
            } catch (reason: any) { message.error(reason.response?.data?.errmsg || reason.message || '安装失败') }
            finally { setBusy(false) }
        }});
    const filtered = items.filter(item => `${item.title || ''} ${item.name}`.toLowerCase().includes(search.trim().toLowerCase()));
    return <div className="fk-content-wrap"><BreadCrumb {...props} /><div className="page-list">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20}}>
            <h3 className="page-title" style={{margin: 0}}>安装插件</h3>
            <Input.Search placeholder="搜索插件" value={search} onChange={event => setSearch(event.target.value)} style={{width: 200}} />
        </div>
        {error ? <Alert type="error" showIcon title="插件市场暂不可用" description={error}
            action={<Space><Link to="/options/extensions">市场设置</Link><Button onClick={() => setReload(value => value + 1)}>重试</Button></Space>} />
            : <Spin spinning={loading}><Table rowKey={item => `${item.name}@${item.version}`} dataSource={filtered} pagination={false} columns={[
                {title: '名称', render: (_: unknown, item: MarketItem) => <>{item.title || item.name}<br /><small>{item.name}</small></>},
                {title: '版本', dataIndex: 'version'}, {title: '描述', dataIndex: 'description'},
                {title: '操作', render: (_: unknown, item: MarketItem) => {
                    const current = installed.find(plugin => plugin.name === item.name);
                    if (!current) return <Button type="link" disabled={busy} onClick={() => install(item)}>安装</Button>;
                    if (current.source === 'npm' && valid(item.version) && valid(current.version) && gt(item.version, current.version)) {
                        return <Button type="link" disabled={busy} onClick={() => install(item, true)}>更新</Button>;
                    }
                    return <Tag>已安装</Tag>;
                }}
            ]} /></Spin>}
    </div></div>;
}
