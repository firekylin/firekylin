import * as React from 'react';
import { BrowserRouter as Router, Route, Redirect, Switch } from 'react-router-dom';
import './container.less';
import DashBoard from './dashboard/dashboard';
import User from './user/user';
import Sidebar from '../components/sidebar';
import Post from './post/post';
import Category from './category/category';

const routerOptions = {
    basename: '/admin',
    forceRefresh: false
};

class Container extends React.Component<any, {}> {
    render() {
        return (
            <Router {...routerOptions}>
                <>
                    <Sidebar />
                    <div className="content">
                        <Switch>
                            <Route exact={true} path="/dashboard" component={DashBoard}/>
                            <Route path="/post" component={Post}/>
                            <Route path="/cate" component={Category}/>
                            <Route path={`/user`} component={User}/>
                            <Redirect to="/dashboard" />
                        </Switch>
                    </div>
                </>
            </Router>
        );
    }
}

export default Container;
