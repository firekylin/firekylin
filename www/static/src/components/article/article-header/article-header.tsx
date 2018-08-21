import * as React from 'react';
import { Input } from 'antd';
import './article-header.less';

class PostArticleHeader extends React.Component<any, {}> {

    id: number = 0;
    type: number = 0;

    constructor(props: any) {
        super(props);
        this.id = this.props.match.params.id || 0;
    }
    /**
     * 判断是否是页面管理
     */
    isPage() {
        return this.type;
    }
    render() {
        const baseUrl = `${location.origin}/${['post', 'page'][this.type]}/`;
        return (
            <div className="article-header">
                <div className="article-header-title">
                    <h5>{`${this.id ? '编辑' : '撰写'}${this.isPage() ? '页面' : '文章'}`}</h5>
                    <Input placeholder="标题" />
                </div>
                <div className="article-header-pathname">
                    <span>{baseUrl}</span>
                    <Input className="pathname-input" />
                    <span>.html </span>
                </div>
            </div>
        );
    }
}

export default PostArticleHeader;
