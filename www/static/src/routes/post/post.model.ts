import PostStore from './post.store';

export interface PostProps {
    postStore: PostStore;
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
    tag: any[];
    cate: any[];
    is_public: string;
    create_time: string;
    allow_comment: true;
    options: {
        template: string;
        featuredImage: string;
        push_sites: any[];
    };
}