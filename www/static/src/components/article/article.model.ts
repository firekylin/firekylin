import { BaseProps } from '../../models/baseprops.model';
import { RouteComponentProps } from 'react-router';
import PostStore from '../../routes/post/post.store';
import UserStore from '../../routes/user/user.store';

export interface ArticleProps extends BaseProps, RouteComponentProps<ArticleParams> {
    postStore: PostStore;
    userStore: UserStore;
}

interface ArticleParams {
    id: number;
}

export interface ArticleState {
    public: number;
    auth: {
        comment: boolean;
    };
    imageUrl: string;
    user: string;
}

export interface PreviewData {
    title: string | 'Untitled';
    pathname: string | 'untitled';
    markdown_content: string;
    create_time: string;
    update_time: string;
    user: string;
    comment_num: number;
    allow_comment: number;
    options: string;
    tag?: any[];
    cate?: number[];
}