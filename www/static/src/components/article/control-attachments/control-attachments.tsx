import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import React from 'react';
import { Button } from 'antd';
import { http } from '../../../utils/http';

interface Props {
    ids: number[];
    onChange: (ids: number[]) => void;
}

export default function ArticleControlAttachments({ids, onChange}: Props) {
    useTranslation('admin');
    const [titles, setTitles] = React.useState<Record<number, string>>({});
    React.useEffect(() => {
        const subscriptions = ids.map(id => http.get<any>(`/admin/api/attachment/${id}`).subscribe(res => {
            if (res.errno === 0) setTitles(current => ({...current, [id]: res.data.title || i18n.t("附件 {{value0}}", {value0: id})}));
        }));
        return () => subscriptions.forEach(subscription => subscription.unsubscribe());
    }, [ids.join(',')]);
    if (!ids.length) return null;
    return <section className="category">
        <h5>{i18n.t("页面附件")}</h5>
        <ul style={{paddingLeft: 20}}>
            {ids.map(id => <li key={id}>
                <span>{titles[id] || i18n.t("附件 {{value0}}", {value0: id})}</span>{' '}
                <Button type="link" size="small" onClick={() => onChange(ids.filter(item => item !== id))}>{i18n.t("移除关联")}</Button>
            </li>)}
        </ul>
        <small>{i18n.t("移除关联不会删除媒体文件。保存页面后生效。")}</small>
    </section>;
}
