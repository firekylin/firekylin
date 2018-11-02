import { RouteComponentProps } from 'react-router';
import { BaseProps } from '../../models/baseprops.model';
import OptionsStore from './options.store';

export interface OptionsProps extends RouteComponentProps<any>, BaseProps {
    optionsStore: OptionsStore;
}