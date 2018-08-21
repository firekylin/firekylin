import * as React from 'react';
import BreadCrumb from '../../../components/breadcrumb';
import PostArticle from '../../../components/article/article';
import './create.less';

class PostCreate extends React.Component<any, {}> {

    constructor(props: any) {
        super(props);
    }
    render() {
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="post-create">
                    <PostArticle {...this.props} />
                </div>
            </>
        );
    }
}

export default PostCreate;
