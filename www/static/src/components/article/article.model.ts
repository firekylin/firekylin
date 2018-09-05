
import { RouteComponentProps } from 'react-router';
import PostStore from '../../routes/post/post.store';
import UserStore from '../../routes/user/user.store';
import SharedStore from '../../shared.store';
import { ArticleMatchParams } from '../../models/article.model';

export interface ArticleProps extends RouteComponentProps<ArticleMatchParams> {
    postStore?: PostStore;
    userStore?: UserStore;
    sharedStore?: SharedStore;
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