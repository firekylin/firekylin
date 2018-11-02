import { FormComponentProps } from 'antd/lib/form';
import CommentStore from './comment.store';

export interface CommentProps extends FormComponentProps {
    commentStore: CommentStore;
}

export interface CommentState {
    comment: {
        type: string;
        name: string;
    };
    submitting: boolean;
}