import * as React from 'react';
import { Button } from 'antd';

class ArticleControlHeader extends React.Component<any, {}> {

    id: number = 0;
    type: number = 0;

    constructor(props: any) {
        super(props);
        // this.id = this.props.match.params.id || 0;
    }
    /**
     * 判断是否是页面管理
     */
    isPage() {
        return this.type;
    }
    render() {
        return (
            <div className="article-control-header" style={{display: 'flex', justifyContent: 'space-between'}}>
                <Button onClick={this.props.saveDraft} type="default">保存草稿</Button>
                <Button onClick={this.props.save} type="primary">发布文章</Button>
            </div>
        );
    }
}

export default ArticleControlHeader;
