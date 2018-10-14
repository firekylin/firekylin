import * as React from 'react';
import './article-editor.less';
import MarkDownEditor from '../../editor';
import { ArticleEditorState } from './article-editor.model';
import { inject, observer } from 'mobx-react';
import { tools } from '../../../utils/tools';
import { PostInfo } from '../../../routes/post/post.model';
@inject('postStore', 'articleStore')
@observer
class ArticleEditor extends React.Component<any, ArticleEditorState> {
    id: number;
    type: number;
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
            create_time: new Date().toUTCString(),
            allow_comment: true,
            options: {
                template: '',
                featuredImage: '',
                push_sites: []
            },
            status: 3,
            user_id: '',
        },
        status: 3,
        cateList: [],
        tagList: [],
        push_sites: [],
        templateList: [],
        users: [],
        isFullScreen: false,
        wordCount: 0,
    };
    constructor(props: any) {
        super(props);
        this.id = this.props.id;
        this.type = this.props.type;
    }

    componentWillReceiveProps(nextProps: any) {
        if (nextProps) {
            this.setState({wordCount: tools.wordCount(this.state.postInfo.markdown_content)});
        }
    }

    handleFetchData(keyword: string) {
        this.props.postStore.setPlReqParams({
            status: 3,
            keyword: keyword
        });
    }
    render(postInfo: PostInfo = this.state.postInfo) {
        return (
            <div className="article-editor">
                <MarkDownEditor
                    content={this.props.articleStore.articleInfo.markdown_content}
                    onChange={content => {
                        postInfo.markdown_content = content;
                        this.props.articleStore.setArticleInfo({markdown_content: content});
                        this.setState({postInfo, wordCount: tools.wordCount(this.state.postInfo.markdown_content)});
                    }}
                    onFullScreen={isFullScreen => this.setState({isFullScreen})}
                    info={{id: this.id, type: this.type}}
                    innerLinks={this.props.postStore.postList}
                    fetchData={keyword => this.handleFetchData(keyword)}
                />
                <p style={{ lineHeight: '30px' }}>
                    <span className="pull-left">
                        文章使用 markdown 格式，格式说明请见
                        <a href="https://guides.github.com/features/mastering-markdown/" target="_blank">
                        这里
                        </a>
                    </span>
                    <span className="pull-right">
                        字数：{this.state.wordCount}
                    </span>
                </p>
            </div>
        );
    }
}

export default ArticleEditor;
