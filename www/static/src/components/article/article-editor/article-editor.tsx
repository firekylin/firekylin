import * as React from 'react';
import './article-editor.less';
import MarkDownEditor from '../../editor';

class PostArticleEditor extends React.Component<any, {}> {
    id;
    type;
    constructor(props: any) {
        super(props);
    }
    render() {
        const postInfo: any = {};
        return (
            <>
                <MarkDownEditor
                    content={postInfo.markdown_content}
                    onChange={content => {
                        console.log(content);
                        // postInfo.markdown_content = content;
                        // this.setState({postInfo});
                    }}
                    onFullScreen={isFullScreen => this.setState({isFullScreen})}
                    info={{id: this.id, type: this.type}}
                />
            </>
        );
    }
}

export default PostArticleEditor;
