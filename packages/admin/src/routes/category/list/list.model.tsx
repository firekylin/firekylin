import CategoryStore from '../category.store';
import { CategoryProps } from '../category.model';

export interface CategoryListProps extends CategoryProps {
    categoryStore: CategoryStore;
}