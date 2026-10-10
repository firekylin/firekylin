import * as React from 'react';
import BreadCrumb from '../../../components/breadcrumb';
import './create.less';
import Article from '../../../components/article/article';
import { PostProps } from '../post.model';
import { ArticleTypeEnum } from '../../../enums/article-type.enum';

interface PostCreateProps extends PostProps {
}

class PostCreate extends React.Component<PostCreateProps, {}> {

    constructor(props: PostCreateProps) {
        super(props);
    }
    render() {
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="post-create">
                    <Article type={ArticleTypeEnum.POST} {...this.props} />
                </div>
            </>
        );
    }
}

export default PostCreate;
