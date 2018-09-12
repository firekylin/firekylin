import * as React from 'react';
import { BrowserRouter as Router, Route, Redirect, Switch } from 'react-router-dom';
import './container.less';
import DashBoard from './dashboard/dashboard';
import User from './user/user';
import Sidebar from '../components/sidebar';
import Post from './post/post';
import Page from './page/page';
import Category from './category/category';
import Tag from './tag/tag';
import Push from './push/push';
import Appearance from './appearance/appearance';

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
                            <Route path="/page" component={Page}/>
                            <Route path="/cate" component={Category}/>
                            <Route path="/tag" component={Tag}/>
                            <Route path={`/user`} component={User}/>
                            <Route path={`/push`} component={Push}/>
                            <Route path="/appearance" component={Appearance}/>
                            <Redirect to="/dashboard" />
                        </Switch>
                    </div>
                </>
            </Router>
        );
    }
}

export default Container;
