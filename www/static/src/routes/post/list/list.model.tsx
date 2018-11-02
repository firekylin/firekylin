import { PostProps } from '../post.model';
import { BaseProps } from '../../../models/baseprops.model';
import { FormComponentProps } from 'antd/lib/form';
import { RouteComponentProps } from 'react-router';
import PostStore from '../post.store';
import { ArticleMatchParams } from '../../../models/article.model';

export interface PostListProps extends PostProps, BaseProps, FormComponentProps, RouteComponentProps<ArticleMatchParams> {
    postStore: PostStore;
}