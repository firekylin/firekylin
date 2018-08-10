import * as React from 'react';
import { BrowserRouter as Router, Route, Redirect, Switch } from 'react-router-dom';
import './container.less';
import DashBoard from './dashboard/dashboard';
import Sidebar from '../components/sidebar';
import { firekylinHistory } from '../utils/history';

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
                        <Route path="/"  component={DashBoard}/>
                        <Route path="/dashboard" component={DashBoard}/>
                        <Redirect to="/dashboard" />
                    </Switch>
                </>
            </Router>
        );
    }
}

export default Container;
