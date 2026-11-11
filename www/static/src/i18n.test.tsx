import React from 'react';
import {describe, it, expect, vi} from 'vitest';
import {render, screen, act} from '@testing-library/react';
import {useTranslation} from 'react-i18next';
import i18n, {ready, refreshLocale, LocaleProvider} from './i18n';

function Example() {
    const {t} = useTranslation('admin');
    return <><span>{t('保存')}</span><input aria-label="draft" defaultValue="unsaved" /></>;
}

describe('admin locale', () => {
    it('switches text without remounting the form', async () => {
        await ready;
        await i18n.changeLanguage('zh-CN');
        render(<LocaleProvider><Example /></LocaleProvider>);
        const input = screen.getByLabelText('draft');
        await act(() => i18n.changeLanguage('en-US'));
        expect(screen.getByText('Save')).toBeTruthy();
        expect(screen.getByLabelText('draft')).toBe(input);
    });

    it('skips language activation for an unchanged persisted snapshot', async () => {
        await ready;
        await i18n.changeLanguage('en-US');
        window.SysConfig = {options: {locale: 'en-US', localeRevision: 'same'}} as any;
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({locale: 'en-US', localeRevision: 'same'}),
        }));
        const change = vi.spyOn(i18n, 'changeLanguage');
        await refreshLocale();
        expect(change).not.toHaveBeenCalled();
        change.mockRestore();
        vi.unstubAllGlobals();
    });

    it('ignores a late response from an earlier refresh', async () => {
        window.SysConfig = {options: {}} as any;
        let finishOld: (value: unknown) => void;
        const oldResponse = new Promise(resolve => {finishOld = resolve;});
        vi.stubGlobal('fetch', vi.fn()
            .mockReturnValueOnce(oldResponse)
            .mockResolvedValueOnce({ok: true, json: async () => ({locale: 'en-US', localeRevision: 'new'})}));
        const first = refreshLocale();
        await refreshLocale();
        finishOld!({ok: true, json: async () => ({locale: 'zh-CN', localeRevision: 'old'})});
        await first;
        expect(i18n.language).toBe('en-US');
        expect(window.SysConfig.options.localeRevision).toBe('new');
        vi.unstubAllGlobals();
    });
});
