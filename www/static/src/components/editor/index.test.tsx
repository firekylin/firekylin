import {useState} from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {of} from 'rxjs';
import i18n, {ready} from '../../i18n';
import MarkDownEditor from './index';

vi.mock('../../utils/http', () => ({http: {post: vi.fn(() => of({errno: 0, data: {html: ''}}))}}));
vi.mock('./link-modal/link-modal', () => ({default: () => null}));
vi.mock('./image-modal/image-modal', () => ({default: () => null}));
vi.mock('../article/ai-editor', async () => {
    const React = await import('react');
    return {AIContext: React.createContext(null), AIToolbar: () => null};
});

const templates = [
    {title: '加粗(Ctrl + B)', prefix: '**', suffix: '**', zh: '加粗文字', en: 'Bold text'},
    {title: '斜体(Ctrl + I)', prefix: '*', suffix: '*', zh: '斜体文字', en: 'Italic text'},
    {title: '删除线', prefix: '~~', suffix: '~~', zh: '删除线文字', en: 'Strikethrough text'},
    {title: '下划线', prefix: '<ins>', suffix: '</ins>', zh: '下划线文字', en: 'Underlined text'},
    {title: '快速链接(Ctrl + K)', prefix: '[', suffix: '](www.yourlink.com)', zh: '链接文本', en: 'Link text'},
    {title: '引用(Ctrl + Q)', prefix: '> ', suffix: '', zh: '引用', en: 'Quote'},
    {title: '键盘按键', prefix: '<kbd>', suffix: '</kbd>', zh: '键盘按键', en: 'Keyboard key'},
    {title: '行内公式(Ctrl + M)', prefix: '`$', suffix: '$`', zh: '行内公式', en: 'Inline formula'},
    {title: '块级公式(Ctrl + Shift + M)', prefix: '```math\n', suffix: '\n```', zh: '公式', en: 'Formula'},
    {title: '标题(Ctrl + H)', prefix: '# ', suffix: '', zh: '标题', en: 'Heading'},
    ...['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'].map(type => ({
        title: '提示框', type, prefix: `> [!${type}]\n> `, suffix: '', zh: '提示内容', en: 'Callout content',
    })),
];

function Harness({initialContent}: {initialContent: string}) {
    const [content, setContent] = useState(initialContent);
    return <MarkDownEditor content={content} onChange={setContent} info={{type: 'post', id: 1}}
        innerLinks={[]} fetchData={vi.fn()} onFullScreen={vi.fn()} />;
}

beforeEach(async () => {
    await ready;
    vi.useFakeTimers();
    localStorage.clear();
    vi.stubGlobal('ResizeObserver', class {observe() {} unobserve() {} disconnect() {}});
    // jsdom has no execCommand. Emulate insertText while keeping the real
    // editor's selection, replacement and controlled onChange path intact.
    Object.defineProperty(document, 'execCommand', {configurable: true, value: vi.fn((command, _ui, text) => {
        expect(command).toBe('insertText');
        const textarea = document.activeElement as HTMLTextAreaElement;
        const value = textarea.value.slice(0, textarea.selectionStart) + text + textarea.value.slice(textarea.selectionEnd);
        fireEvent.change(textarea, {target: {value}});
        return true;
    })});
});

afterEach(async () => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete (document as any).execCommand;
    await i18n.changeLanguage('zh-CN');
});

describe.each(['zh-CN', 'en-US'])('editor placeholders in %s', locale => {
    describe.each([false, true])('with existing selection: %s', hasSelection => {
        it.each(templates)('uses the full translated placeholder for $title $type', async template => {
            await i18n.changeLanguage(locale);
            const before = 'before ';
            const after = ' after';
            const selected = hasSelection ? 'hello' : '';
            render(<Harness initialContent={before + selected + after} />);
            const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
            textarea.setSelectionRange(before.length, before.length + selected.length);
            if ('type' in template) {
                fireEvent.mouseEnter(screen.getByTitle(i18n.t(template.title)));
                await act(async () => {vi.advanceTimersByTime(200)});
                fireEvent.click(screen.getByRole('menuitem', {name: new RegExp(`^${template.type} `)}));
            } else {
                fireEvent.click(screen.getByTitle(i18n.t(template.title)));
            }
            await act(async () => {vi.advanceTimersByTime(20)});
            const placeholder = locale === 'en-US' ? template.en : template.zh;
            const inserted = template.prefix + (selected || placeholder) + template.suffix;
            expect(textarea.value).toBe(before + inserted + after);
            const isSelectedLink = hasSelection && template.prefix === '[';
            const expectedSelection = isSelectedLink ? 'www.yourlink.com' : selected || placeholder;
            expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe(expectedSelection);
            expect(textarea.selectionStart).toBe(isSelectedLink
                ? before.length + template.prefix.length + selected.length + 2
                : before.length + template.prefix.length);
            document.execCommand('insertText', false, 'replacement');
            expect(textarea.value).toBe(isSelectedLink
                ? `${before}[hello](replacement)${after}`
                : before + template.prefix + 'replacement' + template.suffix + after);
        });
    });
});
