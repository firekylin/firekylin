import PostStore from './post.store';
import { RouteComponentProps } from 'react-router';
import { ArticleMatchParams } from '../../models/article.model';

export interface PostProps extends RouteComponentProps<ArticleMatchParams> {
    postStore?: PostStore;
}

// Post列表
export interface PostListRequestParams {
    page?: number;
    status?: number | string;
    keyword?: string;
    cate?: string;
}

export interface PostListResponseData {
    count: number;
    currentPage: number;
    data: any[];
    pageSize: number;
    totalPages: number;
}

export interface PostInfo {
    title: string;
    pathname: string;
    markdown_content: string;
    tag: string[];
    cate: any[];
    is_public: string;
    create_time: string;
    allow_comment: boolean;
    options: {
        template: string;
        featuredImage: string;
        push_sites: any[];
    };
    user_id: string;
    status: number;
    user?: string;
}