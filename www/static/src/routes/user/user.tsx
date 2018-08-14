import * as React from 'react';
import UserList from './user_list/user_list'
import UserCreate from './user_create/user_create'
import {Redirect, Route, Switch} from "react-router";

export default class extends React.Component{
    render() {
        const { match } = this.props;
        return (
            <Switch>
                <Route path={`${match.path}/list`} component={UserList}/>
                <Route path={`${match.path}/create`} component={UserCreate}/>
                <Redirect to={`${match.path}/list`}/>
            </Switch>
        )
    }
}