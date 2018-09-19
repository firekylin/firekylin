import  React from 'react';
import { observer, inject } from 'mobx-react';
import BreadCrumb from '../../../components/breadcrumb';

@inject('editStore', 'sharedStore')
@observer class Edit extends React.Component<{}, {}> {
    render() {
        return (
            <div className="edit">
                <BreadCrumb {...this.props} />
            </div>
        );
    }
}
export default Edit;
