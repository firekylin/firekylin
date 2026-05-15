import { AppearanceProps } from '../appearance.model';
import { FormComponentProps } from '@ant-design/compatible/lib/form';
import NavigationStore from './navigation.store';

export interface NavigationProps extends AppearanceProps, FormComponentProps {
    navigationStore: NavigationStore;
}