import CommentStore from './comment.store';

export interface CommentProps {
    commentStore: CommentStore;
}

export interface CommentState {
    comment: {
        type: string;
        name: string;
    };
    submitting: boolean;
}