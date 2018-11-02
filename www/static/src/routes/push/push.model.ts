import PushStore from  './push.store';
import { RouteComponentProps } from 'react-router';

export interface PushProps extends RouteComponentProps<PushMatchParams> {
    pushStore: PushStore;
}

export interface PushCreateParams {
    submitting: boolean;
    pushInfo: {
        // key: string
        // title: string
        appKey ?: string;
        appSecret ?: string;
        title ?: string;
        url ?: string;
    };
    // id ?: string;
    // appKey ?: string;
    // appSecret ?: string;
    // title ?: string;
    // url ?: string;
}

interface PushMatchParams {
    id: string;
}