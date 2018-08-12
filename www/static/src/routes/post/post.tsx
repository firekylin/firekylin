import * as React from 'react';
import { BrowserRouter as Router, Route, Redirect, Switch } from 'react-router-dom';
import PostList from './list/list';
import PostCreate from './create/create';
import BreadCrumb from '../../components/breadcrumb';

const routerOptions = {
    basename: '/admin/post',
    forceRefresh: false
};

class Post extends React.Component<any, {}> {
    componentDidMount() {
        console.log('post mounted!');
    }
    render() {
        return (
            <>
                <div className="fk-content-wrap">
                    <BreadCrumb {...this.props} />
                    <Router {...routerOptions}>
                        <Switch>
                            {/* <Route exact={true} path="/"  component={PostList}/> */}
                            <Route exact={true} path="/list" component={PostList}/>
                            <Route exact={true} path="/create" component={PostCreate}/>
                            <Redirect to="/list" />
                        </Switch>
                    </Router>
                </div>
            </>
        );
    }
}

export default Post;
