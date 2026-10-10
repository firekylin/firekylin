import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router';
import PostList from './list/list';
import PostCreate from './create/create';
import { PostProps } from './post.model';

export default class Post extends React.Component<PostProps, any> {
    render() {
        const { match } = this.props;
        return (
            <>
                <Switch>
                    <Route path={`${match.path}/list`} component={PostList}/>
                    <Route path={`${match.path}/create`} component={PostCreate}/>
                    <Route path={`${match.path}/edit/:id`} component={PostCreate}/>
                    <Redirect to={`${match.path}/list`}/>
                </Switch>
            </>
        );
    }
}