import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router';
import PostList from './list/list';
import PostCreate from './create/create';

export default class Post extends React.Component<any, any> {
    render() {
        const { match } = this.props;
        return (
            <Switch>
                <Route path={`${match.path}/list`} component={PostList}/>
                <Route path={`${match.path}/create`} component={PostCreate}/>
                <Redirect to={`${match.path}/list`}/>
            </Switch>
        );
    }
}