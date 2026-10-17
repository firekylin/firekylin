import { RouteComponentProps } from '@admin/utils/router';
import { BaseProps } from '../../models/baseprops.model';
import CategoryStore from './category.store';

export interface CategoryCreateParams {
    name: string;
    pathname: string;
    description: string;
    pid: number;
}

export interface CategoryProps extends RouteComponentProps<CategoryMatchParams>, BaseProps {
    categoryStore: CategoryStore;
}

interface CategoryMatchParams {
    id: string;
}
