import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Alert, message, Modal, Space, Spin, Typography } from 'antd';
import { PAGE_SECTION_CONTENT_INSET } from '../../components/protocol/page-section';

const CHANNEL = 'firekylin:admin:v1';
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

function pluginApiUrl(pluginId: string, value: unknown): string | null {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
        return null;
    }
    try {
        const decoded = decodeURIComponent(value.split(/[?#]/, 1)[0]);
        if (decoded.split('/').includes('..')) return null;
    } catch {
        return null;
    }
    return `/api/plugins/${encodeURIComponent(pluginId)}${value}`;
}

function publicError(error: any): string {
    return error && error.response && error.response.data && error.response.data.errmsg ||
        error && error.message || 'Plugin request failed';
}

export default function PluginIframe({pluginId, page, route}: {pluginId: string; page: any; route: any}) {
    const iframe = useRef<HTMLIFrameElement>(null);
    const token = useRef(crypto.getRandomValues(new Uint32Array(4)).join('-'));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [height, setHeight] = useState(page.iframe.height || 720);
    const src = `/admin/api/plugins/${encodeURIComponent(pluginId)}/pages/${encodeURIComponent(page.id)}` +
        `/iframe/#firekylin-token=${encodeURIComponent(token.current)}`;

    useEffect(() => {
        setLoading(true);
        setError('');
        setHeight(page.iframe.height || 720);
    }, [pluginId, page.id, page.iframe.height]);

    useEffect(() => {
        const respond = (target: Window, id: unknown, result?: unknown, requestError?: string) => {
            target.postMessage({channel: CHANNEL, token: token.current, type: 'response',
                id, result, error: requestError}, '*');
        };
        const receive = async(event: MessageEvent) => {
            if (!iframe.current || event.source !== iframe.current.contentWindow) return;
            const data = event.data;
            if (!data || data.channel !== CHANNEL || data.token !== token.current || typeof data.type !== 'string') return;
            const target = event.source as Window;
            if (data.type === 'ready') {
                const computed = getComputedStyle(document.body);
                target.postMessage({channel: CHANNEL, token: token.current, type: 'init', context: {
                    pluginId,
                    pageId: page.id,
                    params: route.match.params,
                    location: {pathname: route.location.pathname, search: route.location.search},
                    theme: {
                        mode: document.documentElement.dataset.theme || 'light',
                        tokens: {
                            colorPrimary: computed.getPropertyValue('--ant-color-primary').trim() || '#1677ff',
                            colorText: computed.color || '#262626',
                            colorBg: computed.backgroundColor || '#ffffff'
                        }
                    }
                }}, '*');
                return;
            }
            if (data.type === 'request') {
                const method = String(data.method || 'GET').toUpperCase();
                const url = pluginApiUrl(pluginId, data.path);
                if (!METHODS.has(method) || !url) return respond(target, data.id, undefined, 'Invalid plugin request');
                try {
                    const response = await axios.request({
                        url,
                        method,
                        params: method === 'GET' ? data.body : undefined,
                        data: method === 'GET' ? undefined : data.body,
                        headers: method === 'GET' ? undefined : {'X-CSRF-Token': window.SysConfig.csrfToken}
                    });
                    respond(target, data.id, response.data);
                } catch (requestError) {
                    respond(target, data.id, undefined, publicError(requestError));
                }
                return;
            }
            if (data.type === 'navigate') {
                const path = data.path;
                if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
                    return respond(target, data.id, undefined, 'Invalid admin path');
                }
                route.history.push(path);
                return respond(target, data.id, true);
            }
            if (data.type === 'notify') {
                const level = ['success', 'error', 'warning', 'info'].includes(data.level) ? data.level : 'info';
                const content = String(data.message || '').slice(0, 500);
                if (level === 'success') message.success(content);
                else if (level === 'error') message.error(content);
                else if (level === 'warning') message.warning(content);
                else message.info(content);
                return respond(target, data.id, true);
            }
            if (data.type === 'confirm') {
                Modal.confirm({
                    title: String(data.title || '请确认').slice(0, 200),
                    content: String(data.message || '').slice(0, 1000),
                    onOk: () => respond(target, data.id, true),
                    onCancel: () => respond(target, data.id, false)
                });
                return;
            }
            if (data.type === 'resize') {
                const requested = Number(data.height);
                if (Number.isFinite(requested)) setHeight(Math.min(2400, Math.max(320, requested)));
                return respond(target, data.id, true);
            }
        };
        window.addEventListener('message', receive);
        return () => window.removeEventListener('message', receive);
    }, [pluginId, page.id, route]);

    return <div className="fk-content-wrap">
        <Space direction="vertical" size={4} style={{marginBottom: 20,
            marginInlineStart: PAGE_SECTION_CONTENT_INSET}}>
            <Typography.Title level={3} style={{margin: 0}}>{page.title}</Typography.Title>
            {page.description ? <Typography.Text type="secondary">{page.description}</Typography.Text> : null}
        </Space>
        {error ? <Alert type="error" message={error} showIcon style={{margin: `0 24px 16px`}} /> : null}
        <Spin spinning={loading}>
            <iframe ref={iframe} title={page.title} src={src}
                sandbox="allow-scripts allow-forms allow-downloads"
                style={{display: 'block', width: 'calc(100% - 48px)', height, margin: '0 24px', border: 0}}
                onLoad={() => setLoading(false)}
                onError={() => {setLoading(false); setError('插件页面加载失败');}} />
        </Spin>
    </div>;
}
