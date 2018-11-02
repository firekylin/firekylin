import { PostInfo } from '../../../routes/post/post.model';

export interface ArticleEditorState {
    postSubmitting: boolean;
    draftSubmitting: boolean;
    postInfo: PostInfo;
    status: number;
    cateList: any[];
    tagList: any[];
    push_sites: any[];
    templateList: any[];
    users: any[];
    isFullScreen: boolean;
    wordCount: number;
}