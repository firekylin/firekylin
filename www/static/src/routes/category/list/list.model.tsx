import CategoryStore from '../category.store';
import SharedStore from '../../../shared.store';

export interface CategoryListProps {
    categoryStore: CategoryStore;
    sharedStore: SharedStore;
}