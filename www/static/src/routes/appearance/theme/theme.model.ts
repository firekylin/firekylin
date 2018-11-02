import { AppearanceProps } from '../appearance.model';
import ThemeStore from './theme.store';
import { FormComponentProps } from 'antd/lib/form';

export interface ThemeProps extends AppearanceProps, FormComponentProps {
    themeStore: ThemeStore;
}

export interface Theme {
    id: string;
    name: string;
    version: string;
    configElements: ConfigElement[];
}

export interface ConfigElement {
    help: string;
    label: string;
    name: string;
    type: string;
    options: any;
}
