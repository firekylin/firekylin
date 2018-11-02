import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router';
import TagList from './list/list';
import { TagProps } from './tag.model';
import TagCreate from './create/create';
export default class Tag extends React.Component<TagProps, any> {
    render() {
        const { match } = this.props;
        return (
            <>
                <Switch>
                    <Route path={`${match.path}/list`} component={TagList}/>
                    <Route path={`${match.path}/create`} component={TagCreate}/>
                    <Route path={`${match.path}/edit/:id`} component={TagCreate}/>
                    <Redirect to={`${match.path}/list`}/>
                </Switch>
            </>
        );
    }
}