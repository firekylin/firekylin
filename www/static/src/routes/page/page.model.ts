import { RouteComponentProps } from 'react-router';
import PageStore from './page.store';
import { ArticleMatchParams } from '../../models/article.model';
import SharedStore from '../../shared.store';

export interface PageListProps extends RouteComponentProps<{}> {
    pageStore: PageStore;
    sharedStore: SharedStore;
}

export interface PageCreateProps extends RouteComponentProps<ArticleMatchParams> {
    pageStore: PageStore;
}

export interface PageInfo {
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