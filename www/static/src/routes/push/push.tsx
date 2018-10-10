import * as React from 'react';
import PushList from './push_list/push_list';
import { Redirect, Route, Switch } from 'react-router';
import PushCreate from './push_create/push_create';
import { PushProps } from './push.model';

export default class Push extends React.Component<PushProps, any> {
    render() {
        const { match } = this.props;
        return (
            <Switch>
                <Route path={`${match.path}/list`} component={PushList}/>
                <Route path={`${match.path}/create`} component={PushCreate}/>
                <Route path={`${match.path}/edit/:id`} component={PushCreate}/>
                <Redirect to={`${match.path}/list`}/>
            </Switch>
        );
    }
}