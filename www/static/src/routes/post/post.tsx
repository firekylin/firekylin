import * as React from 'react';
import { BrowserRouter as Router, Route, Redirect, Switch } from 'react-router-dom';
import PostList from './list/list';
import PostCreate from './create/create';

const routerOptions = {
    basename: '/post',
    forceRefresh: false
};

class Post extends React.Component<any, {}> {
    componentDidMount() {
        console.log('app mounted!');
    }
    render() {
        return (
            <Router {...routerOptions}>
                <>
                    <Switch>
                        <Route exact={true} path="/"  component={PostList}/>
                        <Route path="/list" component={PostList}/>
                        <Route path="/create" component={PostCreate}/>
                        <Redirect to="/list" />
                    </Switch>
                </>
            </Router>
        );
    }
}

export default Post;
