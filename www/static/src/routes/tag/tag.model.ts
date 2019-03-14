import { RouteComponentProps } from 'react-router';

export interface TagCreateParams {
    name: string;
    pathname: string;
}

export interface Tag {
    id: number;
    name: string;
    pathname: string;
    post_tag: number;
}

export interface TagProps extends RouteComponentProps<TagMatchParams> {
}

interface TagMatchParams {
    id: string;
}