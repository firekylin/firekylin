import { Button } from 'antd';

function ArticleControlHeader(props: any) {
    return (
        <div
            className="article-control-header"
            style={{ display: 'flex', justifyContent: 'space-between' }}
        >
            <Button onClick={props.saveDraft} type="default">
                保存草稿
            </Button>
            <Button onClick={props.save} type="primary">
                发布文章
            </Button>
        </div>
    );
}

export default ArticleControlHeader;
