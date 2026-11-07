import { ClockCircleOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

export default function PostAccessIndicator({ post }: { post: {
    status: number;
    is_scheduled: boolean;
    is_public: number;
    create_time: string;
    pathname: string;
} }) {
    const hidden = !post.is_public;
    const scheduled = post.status === 3 && post.is_scheduled;
    return (
        <>
            {hidden && (
                <Tooltip title="文章已设为不公开，前台不可访问">
                    <span className="post-access-indicator" tabIndex={0} role="img" aria-label="不公开，前台不可访问">
                        <EyeInvisibleOutlined />
                    </span>
                </Tooltip>
            )}
            {scheduled && (
                <Tooltip title={`等待发布：${post.create_time}，当前前台不可访问`}>
                    <span className="post-access-indicator" tabIndex={0} role="img" aria-label="等待发布，当前前台不可访问">
                        <ClockCircleOutlined />
                    </span>
                </Tooltip>
            )}
            {post.status === 3 && !hidden && !scheduled && (
                <a href={`/post/${post.pathname}.html`} target="_blank" rel="noopener noreferrer" className="admin-post-link" aria-label="在前台查看文章">
                    <span className="glyphicon glyphicon-link" />
                </a>
            )}
        </>
    );
}
