import React from 'react';
import axios from 'axios';
import {Button, Input, Space, Spin, message} from 'antd';
import AISparkleIcon from './ai-sparkle-icon';
export async function generateImage(body: any) {
    const res = await axios.post('/admin/api/ai-image', body, {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}});
    if (res.data.errno !== 0) throw new Error(res.data.errmsg || '图片生成失败');
    return res.data.data;
}
export async function saveImage(image: any) {
    const blob = await (await fetch(`data:${image.mimeType};base64,${image.data}`)).blob();
    const data = new FormData();
    data.append('file', blob, `ai-${Date.now()}.${image.mimeType.split('/')[1]}`);
    const res = await axios.post('/admin/api/file', data);
    if (res.data.errno !== 0) throw new Error(res.data.errmsg || '上传失败');
    return res.data.data;
}
export function CoverAI({article, onChange}: any) {
    const [enabled, setEnabled] = React.useState(false), [busy, setBusy] = React.useState(false);
    React.useEffect(() => {axios.get('/admin/api/ai-editor').then(r => setEnabled(!!r.data.data?.features?.image)).catch(() => {})}, []);
    return enabled ? <Button type="text" size="small" aria-label="AI生成封面" disabled={busy || !article.markdown_content?.trim()} icon={<AISparkleIcon loading={busy}/>} onClick={async() => {
        setBusy(true);
        try {onChange(await saveImage(await generateImage({prompt: '文章封面', cover: true, title: article.title, content: article.markdown_content})))} catch(e: any) {message.error(e.message)} finally {setBusy(false)}
    }}/> : null;
}
export default function AIImage({onSelect, onBusy}: any) {
    const [images, setImages] = React.useState<any[]>([]), [index, setIndex] = React.useState(0);
    const [prompt, setPrompt] = React.useState(''), [original, setOriginal] = React.useState('');
    const [mode, setMode] = React.useState('prompt'), [busy, setBusy] = React.useState(false);
    const generate = async(edit = false, repeat = false) => {
        const text = repeat ? original : prompt;
        if (!text.trim()) return;
        setBusy(true); onBusy?.(true);
        try {
            const image = await generateImage({prompt: text, ...(edit ? {image: images[index]} : {})});
            setImages(previous => [image, ...previous]); setIndex(0); onSelect(image);
            if (!edit) setOriginal(text);
            setMode('');
        } catch(e: any) {message.error(e.message)} finally {setBusy(false); onBusy?.(false)}
    };
    return <Spin spinning={busy}><Space orientation="vertical" style={{width: '100%'}}>
        {images.length > 0 && <><img alt="AI生成图片" src={`data:${images[index].mimeType};base64,${images[index].data}`} style={{width: '100%', maxHeight: 360, objectFit: 'contain'}}/>
            <Space><Button disabled={busy || index === 0} onClick={() => {setIndex(index - 1); onSelect(images[index - 1])}}>上一张</Button>{index + 1} / {images.length}<Button disabled={busy || index === images.length - 1} onClick={() => {setIndex(index + 1); onSelect(images[index + 1])}}>下一张</Button></Space></>}
        {mode ? <><p>{mode === 'edit' ? '描述这张照片你想要优化的点' : '请描述你想要生成的图片'}</p><Input.TextArea rows={4} value={prompt} disabled={busy} onChange={e => setPrompt(e.target.value)}/><Space><Button type="primary" disabled={busy || !prompt.trim()} onClick={() => generate(mode === 'edit')}>{mode === 'edit' ? '优化' : images.length ? '确认' : '生成'}</Button>{images.length > 0 && <Button disabled={busy} onClick={() => setMode('')}>取消</Button>}</Space></> : <Space><Button disabled={busy} onClick={() => {setPrompt(''); setMode('edit')}}>优化图片</Button><Button disabled={busy} onClick={() => generate(false, true)}>再次生成</Button><Button disabled={busy} onClick={() => {setPrompt(original); setMode('prompt')}}>编辑提示词</Button></Space>}
    </Space></Spin>;
}
