import * as React from 'react';
import { BrowserRouter as Router, Route, Redirect } from 'react-router-dom';
import './container.less';
import DashBoard from './dashboard/dashboard';
import Sidebar from '../components/sidebar';

const routerOptions = {
    basename: '/admin',
    forceRefresh: false
};

function getChildren() {
    return (
        <>
            
        </>
    );
}

class Container extends React.Component<any, {}> {
    componentDidMount() {
        console.log('app mounted!');
    }
    render() {
        return (
            <Router {...routerOptions}>
                <>
                    <Sidebar />
                    <Route exact={true} path="/" render={() => (
                        <Redirect to="/dashboard" />
                    )}/>
                    <Route path="/dashboard" component={DashBoard}/>
                </>
            </Router>
        );
    }
}

export default Container;
