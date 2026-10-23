import {useEffect, useState} from 'react';
import {Alert, AutoComplete, Button, Card, Descriptions, Input, Modal, Select, Space, Spin, Statistic, Switch, Table, message} from 'antd';
import type {Key} from 'react';
import axios from 'axios';
import BreadCrumb from '../../../components/breadcrumb';
import {PAGE_SECTION_CONTENT_INSET} from '../../../components/protocol/page-section';
import './ai-logs.less';

type Log = {id: number; [key: string]: any};
const statuses: Record<string, string> = {unfinished: '未完成', success: '成功', failure: '失败', timeout: '超时', cancelled: '取消'};
const scenarios: Record<string, string> = {unspecified: '未指定场景', 'editor.title': '生成标题', 'editor.summary': '生成摘要',
    'editor.review': '智能审阅', 'editor.translate': '翻译文章', 'editor.slug': '生成 Slug',
    'editor.category': '智能分类', 'editor.tags': '智能标签', 'editor.complete': '内容自动建议', 'connection.test': '连接测试'};
const value = (v: any) => v === null || v === undefined ? '未知' : String(v);
const when = (v: any) => new Date(Number(v)).toLocaleString();
const localMidnight = (day: string) => new Date(`${day}T00:00:00`).toISOString();
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
    if (!Number(log.content_recorded)) return <p>未开启记录</p>;
    const text = log[`${direction}_text`];
    return <>{Number(log[`${direction}_truncated`]) === 1 && <Alert type="warning" title="内容截断：仅保存前 10,000 个字符" />}
        {text === null ? <p>{direction === 'response' ? '调用未返回内容' : '请求不含可记录文本'}</p>
            : <pre style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 280, overflow: 'auto'}}>{text}</pre>}</>;
}
export default function AIAuditLogs() {
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [query, setQuery] = useState({}), [page, setPage] = useState(1), [reload, setReload] = useState(0);
    const [data, setData] = useState<any>({rows: [], summary: {}, total: 0});
    const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
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
    const changeRecording = async(recordContent: boolean) => {
        setBusy(true);
        try { await write({action: 'settings', recordContent}); setData(previous => ({...previous, settings: {recordContent}})); message.success('记录设置已保存，仅影响之后的调用') }
        catch (e: any) { message.error(e.response?.data?.errmsg || e.message) } finally {setBusy(false)}
    };
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
    return <div className="fk-content-wrap"><BreadCrumb /><div style={{marginInlineStart: PAGE_SECTION_CONTENT_INSET}}>
        <h3 className="page-title">AI 调用日志</h3>
        <p className="ai-logs-subtitle">查看 AI 调用记录、Token 用量和处理表现，追溯每一次调用。</p>
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
                <Input type="date" aria-label="开始日期" value={filters.from || ''} onChange={e => updateFilter('from', e.target.value)} />
                <Input type="date" aria-label="结束日期（不含）" title="结束日期（不含当天）" value={filters.to || ''} onChange={e => updateFilter('to', e.target.value)} />
                <Input placeholder="调用人 ID" aria-label="调用人 ID" style={{width: 120}} value={filters.actor_id || ''} onChange={e => updateFilter('actor_id', e.target.value)} />
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
                {title: '场景', dataIndex: 'scenario', render: v => scenarios[v] || v},
                {title: '供应商 / 模型', render: (_, row) => `${value(row.provider)} / ${value(row.model)}`},
                {title: '状态', dataIndex: 'status', render: v => statuses[v] || v},
                {title: '耗时', dataIndex: 'duration_ms', render: v => v == null ? '未知' : `${v} ms`},
                ...['input_tokens', 'output_tokens', 'total_tokens'].map((key, i) => ({title: ['输入 Token', '输出 Token', '总 Token'][i], dataIndex: key, render: value})),
                {title: '详情', render: (_, row) => <Button type="link" onClick={() => setDetailId(row.id)}>查看</Button>},
            ]} />
        <Card className="ai-logs-recording" title="日志记录设置">
            <Space wrap><Switch aria-label="记录请求与返回文本" checked={data.settings?.recordContent === true}
                disabled={loading || busy} loading={busy} onChange={changeRecording} />记录请求与返回文本（默认关闭）</Space>
            <p>开启后仅保存之后调用的脱敏文本，每个方向最多 10,000 个字符。已过滤常见凭证模式，无法保证识别所有自然语言敏感信息。</p>
            <p>日志永久保留，可手动清理。Token 为供应商报告的用量，缺失时显示“未知”；暂不估算费用。</p>
        </Card>
        <Modal title="确认清理 AI 调用日志？" open={confirmation !== null} okText="永久删除" cancelText="取消"
            okButtonProps={{danger: true}} confirmLoading={clearing} cancelButtonProps={{disabled: clearing}}
            closable={!clearing} maskClosable={!clearing} keyboard={!clearing}
            onOk={confirmCleanup} onCancel={() => {if (!clearing) setConfirmation(null)}}>
            {confirmation?.description}
        </Modal>
        <Modal title="AI 调用详情" open={detailId !== null} footer={null} onCancel={() => setDetailId(null)} width={850}>
            {detailError ? <Alert type="error" title={detailError} /> : !detail ? <Spin /> : <>
                <Descriptions column={1} size="small" items={[
                    ...['request_id', 'correlation_id', 'actor_id', 'actor_name', 'source', 'plugin_id', 'scenario', 'provider', 'model', 'capability', 'provider_request_id'].map((key, i) =>
                        ({key, label: ['请求 ID', '关联 ID', '调用人 ID', '调用人', '来源', '插件', '场景', '供应商', '模型', '能力', '供应商请求 ID'][i], children: value(detail[key])})),
                    {key: 'time', label: '时间', children: when(detail.started_at)},
                    {key: 'status', label: '状态', children: statuses[detail.status] || detail.status},
                    {key: 'duration', label: '耗时（ms）', children: value(detail.duration_ms)},
                    {key: 'error', label: '错误', children: detail.error_category ? `${detail.error_category}：${detail.error_message}` : '无'},
                    ...['input_tokens', 'output_tokens', 'total_tokens', 'cache_read_tokens', 'cache_write_tokens', 'reasoning_tokens'].map((key, i) =>
                        ({key, label: ['输入 Token', '输出 Token', '总 Token', '缓存读取 Token', '缓存写入 Token', '推理 Token'][i], children: value(detail[key])})),
                ]} />
                {detail.status === 'unfinished' && <Alert type="info" title="调用尚未结束，或进程退出前未能写入最终状态" />}
                <h4>请求文本</h4><TextRecord log={detail} direction="request" />
                <h4>返回文本</h4><TextRecord log={detail} direction="response" />
            </>}
        </Modal>
    </div></div>;
}
