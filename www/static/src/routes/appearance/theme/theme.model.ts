import { AppearanceProps } from '../appearance.model';
import ThemeStore from './theme.store';

export interface ThemeProps extends AppearanceProps {
    themeStore: ThemeStore;
}

export interface Theme {
    id: string;
    name: string;
    version: string;
    screenshot?: string | null;
    configElements: ConfigElement[];
    themeFields?: ConfigElement[];
}

export interface ConfigElement {
    help: string;
    label: string;
    name: string;
    type: string;
    options: any;
}
