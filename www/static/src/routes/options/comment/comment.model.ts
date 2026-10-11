import CommentStore from './comment.store';

export interface CommentProps {
    commentStore: CommentStore;
}

export interface CommentState {
    comment: {
        audit?: boolean;
        forceLogin?: boolean;
        pageSize?: number;
        locale?: string;
        ipQps?: number;
    };
    submitting: boolean;
}
