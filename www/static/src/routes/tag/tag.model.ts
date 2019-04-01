import { RouteComponentProps } from 'react-router';

export interface TagCreateParams {
    name: string;
    pathname: string;
}

export interface TagProps extends RouteComponentProps<TagMatchParams> {
}

interface TagMatchParams {
    id: string;
}