import PushStore from  './push.store';

export interface PushProps {
    pushStore: PushStore;
}

export interface PushCreateParams {
    submitting: boolean;
    pushInfo: {
        key: string
        title: string
    };
}