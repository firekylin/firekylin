import type {ElementType} from 'react';

export interface SideBarItem {
    url: string;
    icon?: string | ElementType;
    title: string;
    children?: Array<SideBarChildItem>;
    type?: number;
  }

export interface SideBarChildItem {
    type?: number;
    menu?: boolean;
    activePaths?: string[];
    url: string;
    title: string;
}
