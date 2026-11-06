import {render, screen, cleanup, fireEvent} from '@testing-library/react';
import {it, expect, afterEach, vi} from 'vitest';
import {readChatFiles, ChatAttachments, DraftAttachments} from './chat-attachments';
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
    const file = files[0];
    if (file.kind === 'image') throw new Error('Expected text fixture');
    expect(file.size).toBe(new TextEncoder().encode(file.content).length);
    const {container} = render(<ChatAttachments files={files} />);
    expect(screen.getByText(file.content)).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
});
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAE0lEQVQImWP4z8DwnwGM/zMwAAAf7gP9qS/A4gAAAABJRU5ErkJggg==';
it('reads image bytes for preview and rejects unsupported model, format and size', async() => {
    const file = new File([Uint8Array.from(atob(png), c => c.charCodeAt(0))], 'red.png', {type: 'image/png'});
    await expect(readChatFiles([file], [])).rejects.toThrow('不支持图片');
    const files = await readChatFiles([file], [], true);
    expect(files[0]).toMatchObject({kind: 'image', data: png, mimeType: 'image/png'});
    render(<ChatAttachments files={files} />);
    expect(screen.getByRole('img', {name: 'red.png'})).toHaveAttribute('src', `data:image/png;base64,${png}`);
    await expect(readChatFiles([new File(['<svg></svg>'], 'fake.png', {type: 'image/png'})], [], true)).rejects.toThrow('格式');
    await expect(readChatFiles([new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png')], [], true)).rejects.toThrow('2 MiB');
});

it('shows draft cards, opens the selected image in a lightbox and removes the correct file', async() => {
    const remove = vi.fn();
    const files = [{name: 'notes.md', content: 'private text', size: 12},
        {kind: 'image' as const, name: 'red.png', mimeType: 'image/png', data: png, size: 92}];
    const {rerender} = render(<DraftAttachments files={files} remove={remove} />);
    expect(screen.getByText('notes.md')).toBeInTheDocument();
    expect(screen.queryByText('private text')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: '预览图片 red.png'}));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, {key: 'Escape', keyCode: 27});
    fireEvent.click(screen.getByRole('button', {name: '移除附件 red.png'}));
    expect(remove).toHaveBeenCalledWith(1);
    rerender(<DraftAttachments files={files} remove={remove} disabled />);
    expect(screen.getByRole('button', {name: '移除附件 notes.md'})).toBeDisabled();
});
