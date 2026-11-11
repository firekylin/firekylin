import React from 'react';
import i18n from 'i18next';
import {initReactI18next, useTranslation} from 'react-i18next';
import {ConfigProvider} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import en from './locales/en-US.json';

export const ready = i18n.use(initReactI18next).init({
    lng: window.SysConfig?.options?.locale || 'zh-CN',
    fallbackLng: 'zh-CN',
    supportedLngs: ['zh-CN', 'en-US'],
    defaultNS: 'admin',
    ns: ['admin'],
    keySeparator: false,
    nsSeparator: false,
    returnObjects: false,
    interpolation: {escapeValue: false},
    resources: {'zh-CN': {admin: {}}, 'en-US': {admin: en}},
});

let requestSequence = 0;
export async function refreshLocale() {
    const sequence = ++requestSequence;
    const response = await fetch('/admin/locale', {cache: 'no-store'});
    if (!response.ok) throw new Error('Unable to refresh language');
    const data = await response.json();
    if (sequence !== requestSequence || !['zh-CN', 'en-US'].includes(data.locale)) return;
    await ready;
    if (sequence !== requestSequence) return;
    if (data.localeRevision === window.SysConfig.options.localeRevision &&
        data.locale === i18n.language) return;
    await i18n.changeLanguage(data.locale);
    window.SysConfig.options.locale = data.locale;
    window.SysConfig.options.localeRevision = data.localeRevision;
    document.documentElement.lang = data.locale;
}

export function LocaleProvider({children}: {children: React.ReactNode}) {
    const {i18n: instance} = useTranslation('admin');
    const english = instance.language === 'en-US';
    React.useEffect(() => {
        dayjs.locale(english ? 'en' : 'zh-cn');
        document.documentElement.lang = instance.language;
    }, [english, instance.language]);
    React.useEffect(() => {
        const refresh = () => {
            refreshLocale().catch(error => console.error(error));
        };
        window.addEventListener('focus', refresh);
        return () => window.removeEventListener('focus', refresh);
    }, []);
    return <ConfigProvider locale={english ? enUS : zhCN}>{children}</ConfigProvider>;
}

export default i18n;
