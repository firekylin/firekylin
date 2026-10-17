import BreadCrumb from '../../../components/breadcrumb';
import './create.less';
import Article from '../../../components/article/article';
import { PostProps } from '../post.model';
import { ArticleTypeEnum } from '../../../enums/article-type.enum';

interface PostCreateProps extends PostProps {}

function PostCreate(props: PostCreateProps) {
    return (
        <>
            <BreadCrumb className="breadcrumb" {...props} />
            <div className="post-create">
                <Article type={ArticleTypeEnum.POST} {...props} />
            </div>
        </>
    );
}

export default PostCreate;
