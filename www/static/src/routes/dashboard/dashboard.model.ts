import DashBoardStore from './dashboard.store';
import SharedStore from '../../shared.store';

export interface DashBoardProps {
    dashBoardStore: DashBoardStore;
    sharedStore: SharedStore;
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