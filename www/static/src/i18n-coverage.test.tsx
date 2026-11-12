import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import i18n, {LocaleProvider, ready} from './i18n';
import {MemoryRouter} from './utils/router';
import TagCreateOrEdit from './routes/tag/create-or-edit/create-or-edit';
import CaptchaSettings from './routes/options/captcha/captcha';
import {AIButton, AIContext} from './components/article/ai-editor';
import {ExecutionChain, ToolResult, GenerationStatus, ChatMessage} from './routes/dashboard/chat-content';

vi.hoisted(() => {
    window.SysConfig = {options: {}, config: {}, userInfo: {id: 1, name: 'Admin', type: 1}} as any;
});

beforeEach(async () => {
    await ready;
    await i18n.changeLanguage('zh-CN');
    window.SysConfig = {
        options: {locale: 'zh-CN', captcha: {provider: 'turnstile'}},
        config: {},
        pluginAdmin: [],
        userInfo: {id: 1, name: '作者', type: 1},
    } as any;
    vi.stubGlobal('ResizeObserver', class {
        observe() {}
        unobserve() {}
        disconnect() {}
    });
});

afterEach(async () => {
    await act(async () => {
        cleanup();
        await i18n.changeLanguage('zh-CN');
        await new Promise(resolve => setTimeout(resolve, 20));
    });
    vi.unstubAllGlobals();
});

function wrap(children: React.ReactNode) {
    return <MemoryRouter initialEntries={['/tag/create']}>
        <LocaleProvider>{children}</LocaleProvider>
    </MemoryRouter>;
}

describe('admin translation coverage', () => {
    it('switches real form labels and validation without losing user input or remounting', async () => {
        render(wrap(<TagCreateOrEdit {...{match: {params: {}}, history: {push: vi.fn()}} as any} />));
        const input = screen.getByLabelText('标签名称');
        fireEvent.change(input, {target: {value: '我的中文标签'}});
        await act(() => i18n.changeLanguage('en-US'));
        expect(screen.getByLabelText('Tag name')).toBe(input);
        expect(input).toHaveValue('我的中文标签');
        fireEvent.change(input, {target: {value: ''}});
        fireEvent.click(screen.getByRole('button', {name: 'Submit'}));
        expect(await screen.findByText('Enter a tag name')).toBeInTheDocument();
        await act(() => i18n.changeLanguage('zh-CN'));
        expect(screen.getByLabelText('标签名称')).toBe(input);
    });

    it('translates JSON-driven CAPTCHA labels without changing provider values', async () => {
        render(wrap(<CaptchaSettings {...{} as any} />));
        expect(screen.getByLabelText('私钥')).toBeInTheDocument();
        await act(() => i18n.changeLanguage('en-US'));
        expect(screen.getByLabelText('Secret key')).toBeInTheDocument();
        expect(screen.getByLabelText('Language')).toBeInTheDocument();
        expect(screen.getByText('Cloudflare Turnstile')).toBeInTheDocument();
        expect(window.SysConfig.options.captcha.provider).toBe('turnstile');
    });

    it('updates deferred editor tooltip text after a language switch', async () => {
        render(wrap(<AIContext.Provider value={{available: true, content: '', features: {}}}>
            <AIButton operation="summary" minimum={250} label="summary" />
        </AIContext.Provider>));
        await act(() => i18n.changeLanguage('en-US'));
        fireEvent.mouseEnter(screen.getByRole('button', {name: 'summary'}).parentElement!);
        expect(await screen.findByRole('tooltip')).toHaveTextContent('AI can generate a summary');
    });

    it('translates tool states and errors while retaining user-authored Chinese content', async () => {
        render(wrap(<>
            <ExecutionChain entry={{toolCalls: [{id: 'call', name: 'posts.publish', input: {id: 1}}]}}
                actions={[]} messages={[]} running={false} />
            <ToolResult entry={{name: 'posts.get_managed', content: JSON.stringify({id: 1, title: '我的中文文章', status: 0})}} />
            <ToolResult entry={{content: JSON.stringify({error: '评论不存在'})}} />
            <GenerationStatus status="正在思考" />
            <GenerationStatus status="正在执行 posts.publish" />
            <ChatMessage entry={{role: 'event', content: '模型已切换为 Example / model'}} />
        </>));
        await act(() => i18n.changeLanguage('en-US'));
        expect(screen.getByText('Publish post')).toBeInTheDocument();
        expect(screen.getByText('No result received')).toBeInTheDocument();
        expect(screen.getByText('Draft')).toBeInTheDocument();
        expect(screen.getByText('Comment not found')).toBeInTheDocument();
        expect(screen.getByText('Generating response')).toBeInTheDocument();
        expect(screen.getByText('Running Publish post')).toBeInTheDocument();
        expect(screen.getByText('Model changed to Example / model')).toBeInTheDocument();
        expect(screen.getAllByText('我的中文文章')).not.toHaveLength(0);
    });

    it('interpolates names and counts without treating their contents as translation keys', async () => {
        await i18n.changeLanguage('en-US');
        expect(i18n.t('确定删除“{{value0}}”？', {value0: '中文文件 {{name}}'}))
            .toBe('Delete “中文文件 {{name}}”?');
        expect(i18n.t('已删除 {{value0}} 条日志', {value0: 0})).toBe('Deleted 0 logs');
        expect(i18n.t('ACCOUNT_ERROR')).toBe('Invalid username or password');
        expect(i18n.t('确定永久删除选中的 {{count}} 篇文章吗？', {count: 1}))
            .toBe('Permanently delete 1 selected post?');
    });
});
