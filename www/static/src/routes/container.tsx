import * as React from 'react';
import { BrowserRouter, Route, Redirect } from 'react-router-dom';
import './container.less';
import Index from './index';
import Sidebar from '../components/sidebar';

const routerOptions = {
    basename: '/admin',
    forceRefresh: false,
    children: getChildren()
};

function getChildren() {
    return (
        <>
            <Route exact={true} path="/" render={() => (
                <Redirect to="/dashboard" />
            )}/>
            <Route path="/dashboard" component={Index}/>
        </>
    );
}

class Container extends React.Component<any, {}> {
    componentDidMount() {
        console.log('app mounted!');
    }
    render() {
        return (
            <>
                <Sidebar />
                <BrowserRouter {...routerOptions} />
            </>
        );
    }
}

export default Container;
