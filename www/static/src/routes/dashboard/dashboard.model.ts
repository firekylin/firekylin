import DashBoardStore from './dashboard.store';

export interface DashBoardProps {
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
        firekylinVersion: string
    };
}