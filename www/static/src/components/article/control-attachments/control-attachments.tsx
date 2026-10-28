import React from 'react';
import { Button } from 'antd';
import { http } from '../../../utils/http';

interface Props {
    ids: number[];
    onChange: (ids: number[]) => void;
}

export default function ArticleControlAttachments({ids, onChange}: Props) {
    const [titles, setTitles] = React.useState<Record<number, string>>({});
    React.useEffect(() => {
        const subscriptions = ids.map(id => http.get<any>(`/admin/api/attachment/${id}`).subscribe(res => {
            if (res.errno === 0) setTitles(current => ({...current, [id]: res.data.title || `附件 ${id}`}));
        }));
        return () => subscriptions.forEach(subscription => subscription.unsubscribe());
    }, [ids.join(',')]);
    if (!ids.length) return null;
    return <section className="category">
        <h5>页面附件</h5>
        <ul style={{paddingLeft: 20}}>
            {ids.map(id => <li key={id}>
                <span>{titles[id] || `附件 ${id}`}</span>{' '}
                <Button type="link" size="small" onClick={() => onChange(ids.filter(item => item !== id))}>移除关联</Button>
            </li>)}
        </ul>
        <small>移除关联不会删除媒体文件。保存页面后生效。</small>
    </section>;
}
