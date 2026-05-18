import { AppearanceProps } from '../appearance.model';
import NavigationStore from './navigation.store';

export interface NavigationProps extends AppearanceProps {
    navigationStore: NavigationStore;
}