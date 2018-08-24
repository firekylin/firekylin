import * as React from 'react';
import { Row, Col, Input } from 'antd';
import './article.less';
import PostArticleHeader from './article-header/article-header';
import PostArticleEditor from './article-editor/article-editor';

class PostArticle extends React.Component<any, {}> {

    id: number = 0;
    type: number = 0;

    constructor(props: any) {
        super(props);
        this.id = this.props.match.params.id || 0;
    }
    render() {
        return (
            <div className="post-article">
                <Row type="flex">
                    <Col span={18}>
                        <PostArticleHeader {...this.props} />
                        <PostArticleEditor />
                    </Col>
                    <Col span={6}>col-6</Col>
                </Row>
            </div>
        );
    }
}

export default PostArticle;
