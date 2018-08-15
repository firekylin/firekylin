import PostStore from './post.store';

export interface PostRequestParams {
    page: number;
    status: number;
    keyword: string;
    cate: string;
}

export interface PostProps {
    postStore: PostStore;
}