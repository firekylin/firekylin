import * as React from 'react';

class PostList extends React.Component<any, {}> {
    componentDidMount() {
        console.log('app mounted!');
    }
    render() {
        return (
            <h3>I'm List</h3>
        );
    }
}

export default PostList;
