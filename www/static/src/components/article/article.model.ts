import { BaseProps } from '../../models/baseprops.model';
import { RouteComponentProps } from 'react-router';
import PostStore from '../../routes/post/post.store';

export interface ArticleProps extends BaseProps, RouteComponentProps<any> {
    postStore: PostStore;
}

export interface ArticleState {
    public: number;
}