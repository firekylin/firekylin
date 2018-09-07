import * as React from 'react';
import { Input } from 'antd';
import './article-header.less';

class ArticleHeader extends React.Component<any, {}> {

    id: number = 0;

    constructor(props: any) {
        super(props);
        this.id = this.props.match.params.id || 0;
    }

    render() {
        const type = this.props.type;
        const baseUrl = `${location.origin}/${['post', 'page'][type]}/`;
        let postUrl = `/${['post', 'page'][type]}/${this.props.pathname}.html`;
        return (
            <div className="article-header">
                <div className="article-header-title">
                    <h5>{`${this.id ? '编辑' : '撰写'}${type ? '页面' : '文章'}`}</h5>
                    <Input value={this.props.title} onChange={e => this.props.handleTitle(e)} placeholder="标题" />
                </div>
                <div className="article-header-pathname">
                    <span>{baseUrl}</span>
                    <Input disabled={this.props.status === 3} value={this.props.pathname} onChange={e => this.props.handlePath(e)} className="pathname-input" />
                    <span>.html </span>
                    {this.props.status === 3 && this.props.isPublic ?
                        <a style={{marginLeft: 8}} href={postUrl} target="_blank">
                            <span className="glyphicon glyphicon-link" />
                        </a> : null
                    }
                    <a title="预览" style={{marginLeft: 8}} onClick={() => this.props.preview()}>
                        <span className="glyphicon glyphicon-eye-open" />
                    </a>
                </div>
            </div>
        );
    }
}

export default ArticleHeader;
