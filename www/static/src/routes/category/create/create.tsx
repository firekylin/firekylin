import * as React from 'react';
import BreadCrumb from '../../../components/breadcrumb';
import './create.less';

class CategoryCreate extends React.Component<any, {}> {

    constructor(props: any) {
        super(props);
    }
    render() {
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="category-create">
                    {/*  */}
                </div>
            </>
        );
    }
}

export default CategoryCreate;
