import { PostProps } from '../post.model';
import { BaseProps } from '../../../models/baseprops.model';
import { RouteComponentProps } from '@admin/utils/router';
import PostStore from '../post.store';
import { ArticleMatchParams } from '../../../models/article.model';

export interface PostListProps extends PostProps, BaseProps, RouteComponentProps<ArticleMatchParams> {
    postStore: PostStore;
}
