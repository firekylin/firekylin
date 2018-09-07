import * as React from 'react';
import BreadCrumb from '../../../components/breadcrumb';
import './page-create.less';
import { PageCreateProps } from '../page.model';
import Article from '../../../components/article/article';
import { ArticleTypeEnum } from '../../../enums/article-type.enum';

class PageCreate extends React.Component<PageCreateProps, {}> {

    constructor(props: PageCreateProps) {
        super(props);
    }
    render() {
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="page-create">
                    <Article type={ArticleTypeEnum.PAGE} {...this.props} />
                </div>
            </>
        );
    }
}

export default PageCreate;
