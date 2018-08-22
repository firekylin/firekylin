import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router';
import CategoryList from './list/list';

export default class Post extends React.Component<any, any> {
    render() {
        const { match } = this.props;
        return (
            <>
                <Switch>
                    <Route path={`${match.path}/list`} component={CategoryList}/>
                    {/* <Route path={`${match.path}/create`} component={CategoryCreate}/> */}
                    <Redirect to={`${match.path}/list`}/>
                </Switch>
            </>
        );
    }
}