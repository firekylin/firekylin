import { BaseProps } from '../../../models/baseprops.model';
import CategoryStore from '../category.store';
import { FormComponentProps } from 'antd/lib/form';

export interface CategoryCreateProps extends BaseProps, FormComponentProps  {
    categoryStore: CategoryStore;
}