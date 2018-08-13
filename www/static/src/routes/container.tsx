import * as React from 'react';
import { BrowserRouter as Router, Route, Redirect, Switch } from 'react-router-dom';
import './container.less';
import DashBoard from './dashboard/dashboard';
import Sidebar from '../components/sidebar';
import PostList from './post/list/list';
import PostCreate from './post/create/create';

const routerOptions = {
    basename: '/admin',
    forceRefresh: false
};

class Container extends React.Component<any, {}> {
    componentDidMount() {
        console.log('app mounted!');
    }
    render() {
        return (
            <Router {...routerOptions}>
                <>
                    <Sidebar />
                    <Switch>
                        <Route exact={true} path="/dashboard" component={DashBoard}/>
                        <Route exact={true} path="/post" render={() => 
                            <Redirect to="/post/list" />
                        }/>
                        <Route exact={true} path="/post/list" component={PostList}/>
                        <Route exact={true} path="/post/create" component={PostCreate}/>
                        <Redirect to="/dashboard" />
                    </Switch>
                </>
            </Router>
        );
    }
}

export default Container;
