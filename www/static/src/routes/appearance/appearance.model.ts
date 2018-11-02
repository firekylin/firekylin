import { RouteComponentProps } from 'react-router';
import { BaseProps } from '../../models/baseprops.model';
import AppearanceStore from './appearance.store';

export interface AppearanceProps extends RouteComponentProps<any>, BaseProps {
    appearanceStore: AppearanceStore;
}