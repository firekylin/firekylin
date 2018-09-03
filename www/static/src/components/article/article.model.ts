import { BaseProps } from '../../models/baseprops.model';
import { RouteComponentProps } from 'react-router';
import PostStore from '../../routes/post/post.store';
import UserStore from '../../routes/user/user.store';

export interface ArticleProps extends BaseProps, RouteComponentProps<any> {
    postStore: PostStore;
    userStore: UserStore;
}

export interface ArticleState {
    public: number;
    auth: {
        comment: boolean;
    };
    imageUrl: string;
    user: string;
}