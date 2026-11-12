import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import {useEffect, useState} from 'react';
import {Alert, Button, Empty, Image, Input, message, Modal, Space, Spin, Tag} from 'antd';
import axios from 'axios';
import {gt, valid} from 'semver';
import {Link} from '../../../utils/router';
import BreadCrumb from '../../../components/breadcrumb';
import './theme.less';

type InstalledTheme = {id: string; name: string; version: string};

type ThemeItem = {id?: string; name: string; title?: string; version: string; description?: string; screenshot?: string};

function ThemePreview({url, name, onOpen}: {url?: string; name: string; onOpen: () => void}) {
    useTranslation('admin');
    const [failed, setFailed] = useState(false);
    let safeUrl = '';
    try {
        const parsed = new URL(url || '');
        if (parsed.protocol === 'https:') safeUrl = parsed.href;
    } catch { /* No valid preview URL. */ }
    return <div className="theme-preview">
        {safeUrl && !failed ? <>
            <Image src={safeUrl} alt={i18n.t("{{value0}} 预览", {value0: name})} onError={() => setFailed(true)}
                preview={false} />
            <button type="button" className="theme-preview-trigger"
                aria-label={i18n.t("查看 {{value0}} 大图", {value0: name})} onClick={onOpen} />
        </> : <span>{i18n.t("暂无预览")}</span>}
    </div>;
}

export default function ThemeMarket(props: any) {
    useTranslation('admin');
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const [items, setItems] = useState<ThemeItem[]>([]);
    const [installed, setInstalled] = useState<InstalledTheme[]>([]);
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
            if (registry.data.errno !== 0 || catalog.data.errno !== 0) throw new Error(i18n.t("读取主题市场失败"));
            setItems(registry.data.data.items);
            setInstalled(catalog.data.data.themes);
        }).catch(reason => {
            if (!controller.signal.aborted) setError(i18n.t(reason.response?.data?.errmsg || '') || reason.message || i18n.t("读取主题市场失败"));
        }).finally(() => { if (!controller.signal.aborted) setLoading(false) });
        return () => controller.abort();
    }, [reload]);
    const install = (item: ThemeItem, updating = false) => Modal.confirm({title: `${updating ? i18n.t("更新") : i18n.t("安装")} ${item.title || item.name}？`,
        content: updating ? i18n.t("更新至 {{value0}}。本地主题文件将被替换并备份；GitHub 管理需要合并 PR。", {value0: item.version}) :
            i18n.t("版本 {{value0}}。本地安装后可在主题管理中启用；GitHub 管理需要等待仓库 PR 合并。", {value0: item.version}),
        onOk: async() => {
            setBusy(true);
            try {
                const result = await axios.post('/admin/api/marketplace', {
                    operation: updating ? 'theme.update-registry' : 'theme.install-registry', name: item.name, version: item.version
                }, {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}});
                if (result.data.errno !== 0) throw new Error(i18n.t(result.data.errmsg || '') || i18n.t("安装失败"));
                if (result.data.data?.status === 'created') {
                    Modal.info({title: i18n.t("已创建 GitHub 更新 PR"), content: <span>{i18n.t("请查看 ")}<a target="_blank" rel="noreferrer"
                        href={result.data.data.url}>GitHub PR</a>{i18n.t("；合并并部署后生效。")}</span>});
                } else {
                    message.success(updating ? i18n.t("主题更新完成") : i18n.t("主题安装完成"));
                    setReload(value => value + 1);
                }
            } catch (reason: any) { message.error(i18n.t(reason.response?.data?.errmsg || '') || reason.message || i18n.t("安装失败")) }
            finally { setBusy(false) }
        }});
    const renderInstallAction = (item: ThemeItem) => {
        const current = installed.find(theme => theme.id === (item.id || item.name));
        const canUpdate = current && current.name === item.name && valid(item.version) &&
            valid(current.version) && gt(item.version, current.version);
        return canUpdate ? <Button type="primary" disabled={busy} onClick={() => install(item, true)}>{i18n.t("更新")}</Button> :
            current ? <Tag>{i18n.t("已安装")}</Tag> : <Button type="primary" disabled={busy} onClick={() => install(item)}>{i18n.t("安装")}</Button>;
    };
    const filtered = items.filter(item => `${item.title || ''} ${item.name}`.toLowerCase().includes(search.trim().toLowerCase()));
    const previewItem = previewIndex === null ? null : filtered[previewIndex];
    return <div className="fk-content-wrap"><BreadCrumb {...props} /><div className="page-list">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20}}>
            <h3 className="page-title" style={{margin: 0}}>{i18n.t("安装主题")}</h3>
            <Input.Search placeholder={i18n.t("搜索主题")} value={search} onChange={event => setSearch(event.target.value)} style={{width: 200}} />
        </div>
        {error ? <Alert type="error" showIcon title={i18n.t("主题市场暂不可用")} description={error}
            action={<Space><Link to="/options/extensions">{i18n.t("市场设置")}</Link><Button onClick={() => setReload(value => value + 1)}>{i18n.t("重试")}</Button></Space>} />
            : <Spin spinning={loading}>
                {!loading && filtered.length === 0 ? <Empty description={i18n.t("没有找到主题")} /> : <div className="theme-grid">
                    {filtered.map((item, index) => {
                        return <div className="theme-card" key={`${item.name}@${item.version}`}>
                        <ThemePreview key={item.screenshot || ''} url={item.screenshot} name={item.title || item.name} onOpen={() => setPreviewIndex(index)} />
                        <div className="theme-card-info">
                            <div><strong>{item.title || item.name}</strong><div>{i18n.t("版本 ")}{item.version}</div></div>
                            {renderInstallAction(item)}
                        </div>
                        {item.description && <div className="theme-market-description">{item.description}</div>}
                    </div>})}
                </div>}
            </Spin>}
        <Modal open={!!previewItem} onCancel={() => setPreviewIndex(null)}
            title={previewItem && <div className="theme-lightbox-header">
                <span>{previewItem.title || previewItem.name}</span>
                {renderInstallAction(previewItem)}
            </div>} width="calc(100vw - 48px)"
            footer={<Space>
                <Button disabled={previewIndex === null || previewIndex <= 0}
                    onClick={() => setPreviewIndex(index => index! - 1)}>{i18n.t("上一主题")}</Button>
                <span>{previewIndex === null ? 0 : previewIndex + 1} / {filtered.length}</span>
                <Button disabled={previewIndex === null || previewIndex >= filtered.length - 1}
                    onClick={() => setPreviewIndex(index => index! + 1)}>{i18n.t("下一主题")}</Button>
            </Space>}>
            {previewItem && <>
                <p>{previewItem.description || i18n.t("暂无描述")}</p>
                <div className="theme-lightbox-scroll" key={previewIndex}>
                    {/^https:\/\//i.test(previewItem.screenshot || '')
                        ? <img className="theme-lightbox-image" src={previewItem.screenshot}
                            alt={i18n.t("{{value0}} 预览", {value0: previewItem.title || previewItem.name})} />
                        : <span>{i18n.t("暂无预览")}</span>}
                </div>
            </>}
        </Modal>
    </div></div>;
}
