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
}

export interface PostInfo {
    title: string;
    pathname: string;
    markdown_content: string;
    tag: any[];
    cate: any[];
    is_public: string;
    create_time: string;
    allow_comment: true;
    options: {
        template: string;
        featuredImage: string;
        push_sites: any[];
    };
}