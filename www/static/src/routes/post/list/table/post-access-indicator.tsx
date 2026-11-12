import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import { ClockCircleOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

export default function PostAccessIndicator({ post }: { post: {
    status: number;
    is_public: number;
    create_time: string;
    pathname: string;
} }) {
    useTranslation('admin');
    const hidden = !post.is_public;
    const scheduled = post.status === 3 && new Date(post.create_time).getTime() > Date.now();
    return (
        <>
            {hidden && (
                <Tooltip title={i18n.t("文章已设为不公开，前台不可访问")}>
                    <span className="post-access-indicator" tabIndex={0} role="img" aria-label={i18n.t("不公开，前台不可访问")}>
                        <EyeInvisibleOutlined />
                    </span>
                </Tooltip>
            )}
            {scheduled && (
                <Tooltip title={i18n.t("等待发布：{{value0}}，当前前台不可访问", {value0: post.create_time})}>
                    <span className="post-access-indicator" tabIndex={0} role="img" aria-label={i18n.t("等待发布，当前前台不可访问")}>
                        <ClockCircleOutlined />
                    </span>
                </Tooltip>
            )}
            {post.status === 3 && !hidden && !scheduled && (
                <a href={`/post/${post.pathname}.html`} target="_blank" rel="noopener noreferrer" className="admin-post-link" aria-label={i18n.t("在前台查看文章")}>
                    <span className="glyphicon glyphicon-link" />
                </a>
            )}
        </>
    );
}
