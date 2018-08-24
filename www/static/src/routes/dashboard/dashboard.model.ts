import DashBoardStore from './dashboard.store';
import { BaseProps } from '../../models/baseprops.model';

export interface DashBoardProps extends BaseProps {
    dashBoardStore: DashBoardStore;
}

export interface SystemInfo {
    config: any;
    count: {
        cates: number;
        comments: number;
        posts: number;
    };
    versions: {
        platform: string;
        nodeVersion: string;
        v8Version: string;
        mysqlVersion: string;
        thinkjsVersion: string;
        firekylinVersion: string;
        needUpdate: boolean | string;
    };
}