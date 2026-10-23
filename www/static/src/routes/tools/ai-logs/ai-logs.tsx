import {useEffect, useState} from 'react';
import {Alert, AutoComplete, Avatar, Badge, Button, Card, DatePicker, Descriptions, Divider, Input, Modal, Select, Space, Spin, Statistic, Table, message} from 'antd';
import type {Key} from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import BreadCrumb from '../../../components/breadcrumb';
import './ai-logs.less';

hljs.registerLanguage('json', json);
type Provider = {id: string; label?: string; logo?: string; models?: Array<{id: string; label?: string}>};
type Log = {id: number; [key: string]: any};
const statuses: Record<string, string> = {unfinished: '未完成', success: '成功', failure: '失败', timeout: '超时', cancelled: '取消'};
const scenarios: Record<string, string> = {unspecified: '未指定场景', 'editor.title': '生成标题', 'editor.summary': '生成摘要',
    'editor.review': '智能审阅', 'editor.translate': '翻译文章', 'editor.slug': '生成 Slug',
    'editor.category': '智能分类', 'editor.tags': '智能标签', 'editor.complete': '内容自动建议', 'connection.test': '连接测试'};
const value = (v: any) => v === null || v === undefined ? '未知' : String(v);
const when = (v: any) => new Date(Number(v)).toLocaleString();
const localMidnight = (day: string) => dayjs(day).startOf('day').toISOString();
export const tokenRate = (row: Log) => row.total_tokens != null && row.duration_ms > 0
    ? `${(Number(row.total_tokens) * 1000 / Number(row.duration_ms)).toFixed(2)} /s` : '未知';
function StatusBadge({status}: {status: string}) {
    const colors: Record<string, 'default' | 'success' | 'error' | 'warning' | 'processing'> = {
        unfinished: 'processing', success: 'success', failure: 'error', timeout: 'warning', cancelled: 'default',
    };
    return <Badge status={colors[status] || 'default'} text={statuses[status] || status} />;
}
function ProviderIdentity({provider, fallback}: {provider?: Provider; fallback: string}) {
    return <Space size={8}><Avatar shape="square" size={20} src={provider?.logo}>{(provider?.label || fallback || '?').slice(0, 1)}</Avatar>
        <span>{provider?.label || value(fallback)}</span></Space>;
}
function RequestContext({log}: {log: Log}) {
    let context: any;
    try {context = log.request_context ? JSON.parse(log.request_context) : null} catch {context = null}
    if (!context) return <p className="ai-logs-muted">该历史日志未记录请求上下文</p>;
    const text = JSON.stringify({...context, request_id: log.request_id, correlation_id: log.correlation_id}, null, 2);
    return <>{context.context_truncated && <Alert type="warning" title="部分上下文过长，已标记截断" />}
        <pre className="ai-logs-context"><code dangerouslySetInnerHTML={{__html: hljs.highlight(text, {language: 'json'}).value}} /></pre></>;
}
async function read(params: any, signal?: AbortSignal) {
    const response = await axios.get('/admin/api/ai-logs', {params, signal});
    if (response.data.errno !== 0) throw new Error(response.data.errmsg || '读取日志失败');
    return response.data.data;
}
async function write(input: any) {
    const response = await axios.post('/admin/api/ai-logs', input, {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}});
    if (response.data.errno !== 0) throw new Error(response.data.errmsg || '操作失败');
    return response.data.data;
}
function TextRecord({log, direction}: {log: Log; direction: 'request' | 'response'}) {
    if (!Number(log.content_recorded)) return <p>该历史日志未记录文本</p>;
    const text = log[`${direction}_text`];
    return <>{Number(log[`${direction}_truncated`]) === 1 && <Alert type="warning" title="内容截断：仅保存前 10,000 个字符" />}
        {text === null ? <p>{direction === 'response' ? '调用未返回内容' : '请求不含可记录文本'}</p>
            : <pre style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 280, overflow: 'auto'}}>{text}</pre>}</>;
}
export default function AIAuditLogs(props) {
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [query, setQuery] = useState({}), [page, setPage] = useState(1), [reload, setReload] = useState(0);
    const [data, setData] = useState<any>({rows: [], summary: {}, total: 0});
    const [loading, setLoading] = useState(true), [error, setError] = useState('');
    const [selected, setSelected] = useState<Key[]>([]);
    const [detailId, setDetailId] = useState<number | null>(null), [detail, setDetail] = useState<Log | null>(null);
    const [detailError, setDetailError] = useState('');
    const [clearing, setClearing] = useState(false);
    const [confirmation, setConfirmation] = useState<{input: Record<string, unknown>; description: string} | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError('');
        void (async() => {
            try {
                const result = await read({...query, page}, controller.signal);
                if (!controller.signal.aborted) setData({...result, filters: query});
            } catch (e: any) {
                if (!controller.signal.aborted) setError(e.response?.data?.errmsg || e.message);
            } finally {if (!controller.signal.aborted) setLoading(false)}
        })();
        return () => controller.abort();
    }, [query, page, reload]);
    useEffect(() => {
        if (detailId === null) return;
        const controller = new AbortController();
        setDetail(null); setDetailError('');
        read({id: detailId}, controller.signal).then(result => {if (!controller.signal.aborted) setDetail(result)})
            .catch(e => {if (!controller.signal.aborted) setDetailError(e.response?.data?.errmsg || e.message)});
        return () => controller.abort();
    }, [detailId]);
    const updateFilter = (key: string, next: string) => setFilters(previous => ({...previous, [key]: next}));
    const cleanup = (input: Record<string, unknown>, description: string) => setConfirmation({input, description});
    const confirmCleanup = async() => {
        if (!confirmation) return;
        setClearing(true);
        try {
            const result = await write({action: 'cleanup', ...confirmation.input});
            setConfirmation(null); setSelected([]); setPage(1); setReload(v => v + 1);
            message.success(`已删除 ${result.deleted} 条日志`);
        } catch (e: any) {message.error(e.response?.data?.errmsg || e.message)}
        finally {setClearing(false)}
    };
    const summary = data.summary;
    const providerFor = (row: Log): Provider | undefined => (data.providers || []).find(provider => provider.id === row.provider);
    const modelName = (row: Log) => providerFor(row)?.models?.find(model => model.id === row.model)?.label || value(row.model);
    return <div className="fk-content-wrap"><BreadCrumb className="breadcrumb" {...props} /><div className="page-list">
        <h3 className="page-title">AI 调用日志</h3>
        <div className="ai-logs-stats" aria-label="筛选结果统计">
            <Card loading={loading}><Statistic title="请求次数" value={summary.calls || 0} suffix="次" />
                <p>成功 {summary.successes || 0} 次 · 失败/超时/取消 {summary.failures || 0} 次</p></Card>
            <Card loading={loading}><Statistic title="Tokens 数量" value={summary.total_tokens ?? '未知'} />
                <p>仅汇总已知用量 · 用量不完整 {summary.unknown_usage || 0} 次</p></Card>
            <Card loading={loading}><Statistic title="平均处理时间" value={summary.average_duration_ms ?? '未知'}
                precision={summary.average_duration_ms == null ? undefined : 0} suffix={summary.average_duration_ms == null ? undefined : 'ms'} />
                <p>仅统计已记录处理时间的请求</p></Card>
            <Card loading={loading}><Statistic title="成功率" value={summary.success_rate ?? '未知'}
                precision={summary.success_rate == null ? undefined : 1} suffix={summary.success_rate == null ? undefined : '%'} />
                <p>成功请求 / 全部请求</p></Card>
        </div>
        <div className="ai-logs-toolbar">
            <Space wrap className="ai-logs-filters">
                <DatePicker.RangePicker aria-label="日期范围" placeholder={['开始日期', '结束日期']} allowClear
                    value={filters.from && filters.to ? [dayjs(filters.from), dayjs(filters.to).subtract(1, 'day')] : null}
                    onChange={range => setFilters(previous => ({...previous,
                        from: range?.[0]?.format('YYYY-MM-DD') || '',
                        to: range?.[1]?.add(1, 'day').format('YYYY-MM-DD') || '',
                    }))} />
                <Select aria-label="调用人" placeholder="全部调用人" allowClear showSearch optionFilterProp="label" style={{width: 160}}
                    value={filters.actor_id || undefined} onChange={id => updateFilter('actor_id', id || '')}
                    options={(data.actors || []).map(actor => ({value: String(actor.id), label: actor.display_name || actor.name}))} />
                <AutoComplete aria-label="场景" placeholder="全部场景" allowClear style={{width: 150}} value={filters.scenario || undefined}
                    options={Object.entries(scenarios).map(([v, label]) => ({value: v, label}))} onChange={v => updateFilter('scenario', v || '')} />
                {['provider', 'model'].map(key => <Input key={key} aria-label={key === 'provider' ? '供应商' : '模型'} placeholder={key === 'provider' ? '供应商 ID' : '模型 ID'}
                    style={{width: 150}} value={filters[key] || ''} onChange={e => updateFilter(key, e.target.value)} />)}
                <Select aria-label="状态" placeholder="全部状态" allowClear style={{width: 120}} value={filters.status || undefined}
                    options={Object.entries(statuses).map(([v, label]) => ({value: v, label}))} onChange={v => updateFilter('status', v || '')} />
                <Button type="primary" onClick={() => {setPage(1); setSelected([]); setQuery({...filters, ...(filters.from ? {from: localMidnight(filters.from)} : {}), ...(filters.to ? {to: localMidnight(filters.to)} : {})})}}>筛选</Button>
                <Button onClick={() => {setFilters({}); setQuery({}); setPage(1); setSelected([])}}>重置</Button>
                <Button onClick={() => setReload(v => v + 1)}>刷新</Button>
            </Space>
            <Space wrap className="ai-logs-danger-actions">
                <Button danger disabled={loading || clearing || !!error || !selected.length}
                    onClick={() => cleanup({ids: [...selected]}, `将永久删除选中的 ${selected.length} 条日志。`)}>清理选中日志</Button>
                <Button danger disabled={loading || clearing || !!error || !data.total}
                    onClick={() => cleanup({scope: 'filtered', filters: {...data.filters}},
                        `将永久删除当前已应用筛选条件下的所有日志（当前 ${data.total} 条，包含所有分页）。${Object.values(data.filters || {}).some(Boolean) ? '' : '当前没有筛选条件，将清理全部日志。'}此操作不可撤销。`)}>清理当前所有日志</Button>
            </Space>
        </div>
        {error && <Alert type="error" title={error} showIcon />}
        <Table<Log> rowKey="id" loading={loading} dataSource={data.rows} scroll={{x: 1300}}
            rowSelection={{selectedRowKeys: selected, onChange: setSelected}}
            pagination={{current: page, pageSize: 20, total: data.total, showSizeChanger: false, onChange: next => {setPage(next); setSelected([])}}}
            columns={[
                {title: '时间', dataIndex: 'started_at', render: when},
                {title: '调用人', dataIndex: 'actor_name'},
                {title: '场景', render: (_, row) => <div>{scenarios[row.scenario] || row.scenario}
                    <div className="ai-logs-muted">{providerFor(row)?.label || value(row.provider)}</div></div>},
                {title: '供应商 / 模型', render: (_, row) => <div>
                    <ProviderIdentity provider={providerFor(row)} fallback={row.provider} />
                    <div className="ai-logs-model ai-logs-muted">{modelName(row)}</div></div>},
                {title: '状态', dataIndex: 'status', render: status => <StatusBadge status={status} />},
                {title: '耗时', dataIndex: 'duration_ms', render: v => v == null ? '未知' : `${v} ms`},
                {title: '总 Token', render: (_, row) => <div>{value(row.total_tokens)}<div className="ai-logs-muted">{tokenRate(row)}</div></div>},
                {title: '详情', render: (_, row) => <Button type="link" onClick={() => setDetailId(row.id)}>查看</Button>},
            ]} />
        <Modal title="确认清理 AI 调用日志？" open={confirmation !== null} okText="永久删除" cancelText="取消"
            okButtonProps={{danger: true}} confirmLoading={clearing} cancelButtonProps={{disabled: clearing}}
            closable={!clearing} maskClosable={!clearing} keyboard={!clearing}
            onOk={confirmCleanup} onCancel={() => {if (!clearing) setConfirmation(null)}}>
            {confirmation?.description}
        </Modal>
        <Modal title={<div className="ai-logs-detail-header"><span>{detail ? scenarios[detail.scenario] || detail.scenario : '日志详情'}</span>
            {detail && <StatusBadge status={detail.status} />}</div>} open={detailId !== null} footer={null}
            onCancel={() => setDetailId(null)} width={850}>
            <Divider />
            {detailError ? <Alert type="error" title={detailError} /> : !detail ? <Spin /> : <div className="ai-logs-detail-sections">
                <section><h4>基础信息</h4><Descriptions column={2} size="small" items={[
                    {key: 'time', label: '时间', children: when(detail.started_at)},
                    {key: 'duration', label: '耗时', children: detail.duration_ms == null ? '未知' : `${detail.duration_ms} ms`},
                    ...['capability', 'actor_id', 'actor_name', 'source', 'plugin_id'].map((key, i) =>
                        ({key, label: ['能力', '调用人 ID', '调用人', '来源', '插件'][i], children: value(detail[key])})),
                    ...(['failure', 'timeout'].includes(detail.status) && (detail.error_category || detail.error_message) ? [{key: 'error', label: '错误信息', span: 2,
                        children: [detail.error_category, detail.error_message].filter(Boolean).join('：')}] : []),
                ]} /></section>
                <section><h4>模型信息</h4><Descriptions column={2} size="small" items={[
                    {key: 'provider', label: '供应商', children: <ProviderIdentity provider={providerFor(detail)} fallback={detail.provider} />},
                    {key: 'model', label: '模型', children: modelName(detail)},
                    {key: 'provider-request', label: '模型请求 ID', span: 2, children: value(detail.provider_request_id)},
                ]} /></section>
                <section><h4>Token 使用情况</h4><Descriptions column={2} size="small" items={[
                    ...['input_tokens', 'output_tokens', 'total_tokens', 'cache_read_tokens', 'cache_write_tokens', 'reasoning_tokens'].map((key, i) =>
                        ({key, label: ['输入 Token', '输出 Token', '总 Token', '缓存读取 Token', '缓存写入 Token', '推理 Token'][i], children: value(detail[key])})),
                    {key: 'rate', label: 'Token 速率', children: tokenRate(detail)},
                ]} /></section>
                <section><h4>请求文本</h4><TextRecord log={detail} direction="request" /></section>
                <section><h4>返回文本</h4><TextRecord log={detail} direction="response" /></section>
                <section><h4>请求上下文</h4><RequestContext log={detail} /></section>
            </div>}
        </Modal>
    </div></div>;
}
