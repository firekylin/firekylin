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