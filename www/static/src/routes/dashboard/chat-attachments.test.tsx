import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';
import {it, expect, afterEach} from 'vitest';
import {readChatFiles, ChatAttachments} from './chat-attachments';
afterEach(cleanup);
it('rejects binary, non-UTF8, unsupported, empty, oversized and excessive files', async() => {
    for (const files of [
        [new File(['x'], 'a.pdf')], [new File([''], 'empty.txt')],
        [new File(['\0binary'], 'a.txt')], [new File([new Uint8Array([255])], 'bad.txt')],
        [new File(['a'.repeat(32769)], 'big.txt')],
        Array.from({length: 6}, () => new File(['a'], 'a.txt')),
        Array.from({length: 3}, () => new File(['a'.repeat(32768)], 'a.txt'))
    ]) await expect(readChatFiles(files, [])).rejects.toThrow();
});
it('counts UTF8 bytes and previews dangerous markup as inert text', async() => {
    const files = await readChatFiles([new File(['<img src=x onerror=alert(1)>你好'], 'a.md')], []);
    expect(files[0].size).toBe(new TextEncoder().encode(files[0].content).length);
    const {container} = render(<ChatAttachments files={files} />);
    expect(screen.getByText(files[0].content)).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
});
