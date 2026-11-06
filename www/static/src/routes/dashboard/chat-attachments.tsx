import React from 'react';
import {Button} from 'antd';
export interface ChatAttachment {name: string; content: string; size: number}
export const attachmentAccept = '.txt,.md,.markdown,.csv,.json,.log';
export async function readChatFiles(files: File[], existing: ChatAttachment[]): Promise<ChatAttachment[]> {
    if (existing.length + files.length > 5) throw new Error('每条消息最多添加 5 个文本文件');
    const result = [...existing];
    for (const file of files) {
        if (!/\.(txt|md|markdown|csv|json|log)$/i.test(file.name) || /[\\/\x00-\x1f\x7f]/.test(file.name) || file.name.length > 120) {
            throw new Error('仅支持 TXT、Markdown、CSV、JSON、LOG 文本文件');
        }
        if (!file.size || file.size > 32 * 1024) throw new Error('文本文件不能为空，且每个不能超过 32 KiB');
        const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(new Error('文件读取失败，请重新选择'));
            reader.onabort = () => reject(new Error('文件读取已取消'));
            reader.readAsArrayBuffer(file);
        });
        let content: string;
        try { content = new TextDecoder('utf-8', {fatal: true}).decode(buffer) }
        catch { throw new Error('文件必须是有效的 UTF-8 纯文本') }
        if (!content || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\uFFFD]/.test(content)) throw new Error('文件必须是有效的 UTF-8 纯文本');
        result.push({name: file.name, content, size: new TextEncoder().encode(content).length});
    }
    if (result.reduce((sum, file) => sum + file.size, 0) > 64 * 1024) throw new Error('每条消息的文件总大小不能超过 64 KiB');
    return result;
}
export function ChatAttachments({files, remove, disabled}: {
    files: ChatAttachment[]; remove?: (index: number) => void; disabled?: boolean;
}) {
    return <div className="chat-attachments">{files.map((file, index) => <div key={index} className="chat-attachment">
        <details><summary>{file.name} · {file.size} B · 文本附件</summary><pre>{file.content}</pre></details>
        {remove && <Button size="small" disabled={disabled} aria-label={`移除附件 ${file.name}`} onClick={() => remove(index)}>移除</Button>}
    </div>)}</div>;
}
