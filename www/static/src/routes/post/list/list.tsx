import * as React from 'react';
import BreadCrumb from '../../../components/breadcrumb';

class PostList extends React.Component<any, {}> {
    componentDidMount() {
        console.log('app mounted!');
    }
    render() {
        return (
            <div className="fk-content-wrap">
                <BreadCrumb {...this.props} />
                <h3>I'm List</h3>
            </div>
        );
    }
}

export default PostList;
