import * as React from 'react';
import { HashRouter, Route } from 'react-router-dom';
import './container.less';
import Index from './index';

class Container extends React.Component<any, {}> {
    componentDidMount() {
        console.log('app mounted!');
    }
    render() {
        return (
            <HashRouter>
                <Route exact={true} path="/" component={Index}/>
            </HashRouter>
        );
    }
}

export default Container;
