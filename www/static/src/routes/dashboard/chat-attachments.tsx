import {useState} from 'react';
import {Button, Image} from 'antd';
import {CloseOutlined, FileOutlined} from '@ant-design/icons';
export type ChatAttachment = {name: string; size: number} & (
    {kind?: 'text'; content: string} | {kind: 'image'; mimeType: string; data: string; width?: number; height?: number}
);
export const attachmentAccept = '.png,.jpg,.jpeg,.webp,.txt,.md,.markdown,.csv,.json,.log';
export async function readChatFiles(files: File[], existing: ChatAttachment[], allowImages = false): Promise<ChatAttachment[]> {
    if (existing.length + files.length > 5) throw new Error('每条消息最多添加 5 个附件');
    const result = [...existing];
    for (const file of files) {
        const isImage = /\.(png|jpe?g|webp)$/i.test(file.name);
        if (isImage && !allowImages) throw new Error('当前模型不支持图片理解，请先选择标记为“可读图片”的模型');
        if (!/\.(png|jpe?g|webp|txt|md|markdown|csv|json|log)$/i.test(file.name) || /[\\/\x00-\x1f\x7f]/.test(file.name) || file.name.length > 120) {
            throw new Error('仅支持 PNG、JPEG、WebP 图片及 TXT、Markdown、CSV、JSON、LOG 文本文件');
        }
        if (!file.size || file.size > (isImage ? 2 * 1024 * 1024 : 32 * 1024)) {
            throw new Error(isImage ? '图片不能为空，且每张不能超过 2 MiB' : '文本文件不能为空，且每个不能超过 32 KiB');
        }
        const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(new Error('文件读取失败，请重新选择'));
            reader.onabort = () => reject(new Error('文件读取已取消'));
            reader.readAsArrayBuffer(file);
        });
        if (isImage) {
            const bytes = new Uint8Array(buffer);
            const hex = Array.from(bytes.slice(0, 12), byte => byte.toString(16).padStart(2, '0')).join('');
            const mimeType = hex.startsWith('89504e470d0a1a0a') ? 'image/png' : hex.startsWith('ffd8ff') ? 'image/jpeg' :
                hex.startsWith('52494646') && hex.slice(16, 24) === '57454250' ? 'image/webp' : '';
            if (!mimeType || file.type && file.type !== mimeType) throw new Error('图片内容与声明的格式不符');
            let binary = '';
            for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
            result.push({kind: 'image', name: file.name, mimeType, data: btoa(binary), size: file.size});
            continue;
        }
        let content: string;
        try { content = new TextDecoder('utf-8', {fatal: true}).decode(buffer) }
        catch { throw new Error('文件必须是有效的 UTF-8 纯文本') }
        if (!content || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\uFFFD]/.test(content)) throw new Error('文件必须是有效的 UTF-8 纯文本');
        result.push({name: file.name, content, size: new TextEncoder().encode(content).length});
    }
    if (result.filter(file => file.kind !== 'image').reduce((sum, file) => sum + file.size, 0) > 64 * 1024) throw new Error('每条消息的文件总大小不能超过 64 KiB');
    if (result.filter(file => file.kind === 'image').reduce((sum, file) => sum + file.size, 0) > 4 * 1024 * 1024) throw new Error('每条消息的图片总大小不能超过 4 MiB');
    return result;
}
export function ChatAttachments({files, remove, disabled}: {
    files: ChatAttachment[]; remove?: (index: number) => void; disabled?: boolean;
}) {
    return <div className="chat-attachments">{files.map((file, index) => <div key={index} className="chat-attachment">
        <details open={file.kind === 'image'}><summary>{file.name} · {file.size} B · {file.kind === 'image' ? '图片附件' : '文本附件'}</summary>
            {file.kind === 'image' ? <img className="chat-image-preview" src={`data:${file.mimeType};base64,${file.data}`} alt={file.name} /> : <pre>{file.content}</pre>}
        </details>
        {remove && <Button size="small" disabled={disabled} aria-label={`移除附件 ${file.name}`} onClick={() => remove(index)}>移除</Button>}
    </div>)}</div>;
}

export function DraftAttachments({files, remove, disabled}: {
    files: ChatAttachment[]; remove: (index: number) => void; disabled?: boolean;
}) {
    const [preview, setPreview] = useState({open: false, current: 0});
    const images = files.filter(file => file.kind === 'image');
    return <>{preview.open && <Image.PreviewGroup items={images.map(file => ({src: `data:${file.mimeType};base64,${file.data}`, alt: file.name}))}
        preview={{...preview, onOpenChange: open => setPreview(value => ({...value, open})),
            onChange: current => setPreview(value => ({...value, current}))}} />}
        <div className="chat-draft-attachments" aria-label="待发送附件">
            {files.map((file, index) => <div className="chat-draft-card" key={index}>
                {file.kind === 'image' ? <button type="button" className="chat-draft-image" aria-label={`预览图片 ${file.name}`}
                    onClick={() => setPreview({open: true, current: images.indexOf(file)})}>
                    <img src={`data:${file.mimeType};base64,${file.data}`} alt={file.name} />
                </button> : <div className="chat-draft-file" title={file.name}>
                    <FileOutlined className="chat-draft-file-icon" />
                    <span className="chat-draft-file-name"><FileOutlined /><span>{file.name}</span></span>
                </div>}
                <button type="button" className="chat-draft-remove" disabled={disabled} aria-label={`移除附件 ${file.name}`}
                    onClick={() => {setPreview(value => ({...value, open: false})); remove(index)}}><CloseOutlined /></button>
            </div>)}
        </div>
    </>;
}
