import BreadCrumb from '../../../components/breadcrumb';
import './page-create.less';
import { PageCreateProps } from '../page.model';
import Article from '../../../components/article/article';
import { ArticleTypeEnum } from '../../../enums/article-type.enum';

function PageCreate(props: PageCreateProps) {
    return (
        <>
            <BreadCrumb className="breadcrumb" {...props} />
            <div className="page-create">
                <Article type={ArticleTypeEnum.PAGE} {...props} />
            </div>
        </>
    );
}

export default PageCreate;
