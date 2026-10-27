import {useEffect, useState} from 'react';
import {Alert, Button, Empty, Input, message, Modal, Space, Spin, Tag} from 'antd';
import axios from 'axios';
import {Link} from '../../../utils/router';
import BreadCrumb from '../../../components/breadcrumb';
import './theme.less';

type ThemeItem = {id?: string; name: string; title?: string; version: string; description?: string; screenshot?: string};

function ThemePreview({url, name}: {url?: string; name: string}) {
    const [failed, setFailed] = useState(false);
    let safeUrl = '';
    try {
        const parsed = new URL(url || '');
        if (parsed.protocol === 'https:') safeUrl = parsed.href;
    } catch { /* No valid preview URL. */ }
    return <div className="theme-preview">
        {safeUrl && !failed ? <img src={safeUrl} alt={`${name} 预览`} onError={() => setFailed(true)} /> : <span>暂无预览</span>}
    </div>;
}

export default function ThemeMarket(props: any) {
    const [items, setItems] = useState<ThemeItem[]>([]);
    const [installed, setInstalled] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError('');
        Promise.all([
            axios.get('/admin/api/extension-settings?type=theme', {signal: controller.signal}),
            axios.get('/admin/api/marketplace', {signal: controller.signal})
        ]).then(([registry, catalog]) => {
            if (registry.data.errno !== 0 || catalog.data.errno !== 0) throw new Error('读取主题市场失败');
            setItems(registry.data.data.items);
            setInstalled(catalog.data.data.themes.map(item => item.id));
        }).catch(reason => {
            if (!controller.signal.aborted) setError(reason.response?.data?.errmsg || reason.message || '读取主题市场失败');
        }).finally(() => { if (!controller.signal.aborted) setLoading(false) });
        return () => controller.abort();
    }, [reload]);
    const install = (item: ThemeItem) => Modal.confirm({title: `安装 ${item.title || item.name}？`,
        content: `版本 ${item.version}。安装完成后可在主题管理中启用。`,
        onOk: async() => {
            setBusy(true);
            try {
                const result = await axios.post('/admin/api/marketplace', {
                    operation: 'theme.install-registry', name: item.name, version: item.version
                }, {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}});
                if (result.data.errno !== 0) throw new Error(result.data.errmsg || '安装失败');
                message.success('主题安装完成');
                setReload(value => value + 1);
            } catch (reason: any) { message.error(reason.response?.data?.errmsg || reason.message || '安装失败') }
            finally { setBusy(false) }
        }});
    const filtered = items.filter(item => `${item.title || ''} ${item.name}`.toLowerCase().includes(search.trim().toLowerCase()));
    return <div className="fk-content-wrap"><BreadCrumb {...props} /><div className="page-list">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20}}>
            <h3 className="page-title" style={{margin: 0}}>安装主题</h3>
            <Input.Search placeholder="搜索主题" value={search} onChange={event => setSearch(event.target.value)} style={{width: 200}} />
        </div>
        {error ? <Alert type="error" showIcon title="主题市场暂不可用" description={error}
            action={<Space><Link to="/options/extensions">市场设置</Link><Button onClick={() => setReload(value => value + 1)}>重试</Button></Space>} />
            : <Spin spinning={loading}>
                {!loading && filtered.length === 0 ? <Empty description="没有找到主题" /> : <div className="theme-grid">
                    {filtered.map(item => <div className="theme-card" key={`${item.name}@${item.version}`}>
                        <ThemePreview key={item.screenshot || ''} url={item.screenshot} name={item.title || item.name} />
                        <div className="theme-card-info">
                            <div><strong>{item.title || item.name}</strong><div>版本 {item.version}</div></div>
                            {installed.includes(item.id || item.name)
                                ? <Tag>已安装</Tag> : <Button type="primary" disabled={busy} onClick={() => install(item)}>安装</Button>}
                        </div>
                        {item.description && <div className="theme-market-description">{item.description}</div>}
                    </div>)}
                </div>}
            </Spin>}
    </div></div>;
}
