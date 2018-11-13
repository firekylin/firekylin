
import { RouteComponentProps } from 'react-router';
import UserStore from '../../routes/user/user.store';
import SharedStore from '../../shared.store';
import { ArticleMatchParams } from '../../models/article.model';
import { ArticleTypeEnum } from '../../enums/article-type.enum';
import ArticleStore from './article.store';

export interface ArticleProps extends RouteComponentProps<ArticleMatchParams> {
    userStore: UserStore;
    sharedStore: SharedStore;
    articleStore: ArticleStore;
    type: ArticleTypeEnum;
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

export interface ArticleInfo {
    title: string;
    pathname: string;
    markdown_content: string;
    tag: string[];
    cate: any[];
    is_public: string;
    create_time: string;
    allow_comment: boolean;
    // options: string;
    options: {
        template: string;
        featuredImage: string;
        push_sites: any[];
    };
    user_id: string;
    status: number;
    user?: string;
}

export interface ArticleInfoOptions {
    template: string;
    featuredImage: string;
    push_sites: any[];
}