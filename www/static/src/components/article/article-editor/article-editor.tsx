import * as React from 'react';
import './article-editor.less';
import MarkDownEditor from '../../editor';
import { ArticleEditorState, PostInfo } from './article-editor.model';
import { inject, observer } from 'mobx-react';
@inject('postStore')
@observer class PostArticleEditor extends React.Component<any, ArticleEditorState> {
    id;
    type;
    state: ArticleEditorState = {
        postSubmitting: false,
        draftSubmitting: false,
        postInfo: {
            title: '',
            pathname: '',
            markdown_content: '',
            tag: [],
            cate: [],
            is_public: '1',
            create_time: '',
            allow_comment: true,
            options: {
            template: '',
            featuredImage: '',
            push_sites: []
            }
        },
        status: 3,
        cateList: [],
        tagList: [],
        push_sites: [],
        templateList: [],
        users: [],
        isFullScreen: false,
    };
    constructor(props: any) {
        super(props);
    }

    handleFetchData(keyword: string) {
        this.props.postStore.setPlReqParams({
            status: 3,
            keyword: keyword
        });
    }
    render(postInfo: PostInfo = this.state.postInfo) {

        return (
            <>
                <MarkDownEditor
                    content={postInfo.markdown_content}
                    onChange={content => {
                        postInfo.markdown_content = content;
                        this.setState({postInfo});
                    }}
                    onFullScreen={isFullScreen => this.setState({isFullScreen})}
                    info={{id: this.id, type: this.type}}
                    innerLinks={this.props.postStore.postList}
                    fetchData={keyword => this.handleFetchData(keyword)}
                />
            </>
        );
    }
}

export default PostArticleEditor;
