import { RouteComponentProps } from 'react-router';
import { BaseProps } from '../../models/baseprops.model';
import TagStore from './tag.store';

export interface TagCreateParams {
    name: string;
    pathname: string;
    pid: number;
}

export interface TagProps extends RouteComponentProps<TagMatchParams>, BaseProps {
    tagStore: TagStore;
}

interface TagMatchParams {
    id: string;
}