import * as React from 'react';
import BreadCrumb from '../../../components/breadcrumb';

class PostCreate extends React.Component<any, {}> {
    componentDidMount() {
        console.log('app mounted!');
    }
    render() {
        return (
            <div className="fk-content-wrap">
                <BreadCrumb {...this.props} />
                <h3>I'm Create</h3>
            </div>
        );
    }
}

export default PostCreate;
