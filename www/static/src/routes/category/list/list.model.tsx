import CategoryStore from '../category.store';
import { BaseProps } from '../../../models/baseprops.model';

export interface CategoryListProps extends BaseProps {
    categoryStore: CategoryStore;
}