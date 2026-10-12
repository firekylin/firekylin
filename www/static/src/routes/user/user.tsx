import * as React from 'react';
import UserList from './user_list/user_list';
import UserCreate from './user_create/user_create';
import UserEditPwd from './user_edit_pwd/user_edit_pwd';
import { Redirect, Route, Switch } from '@admin/utils/router';
import { UserProps } from './user.model';

export default class extends React.Component<UserProps, any> {
    render() {
        const { match } = this.props;
        const userInfo = window.SysConfig.userInfo;

        if (userInfo.type === 4) {
            const editPath = `${match.path}/edit/${userInfo.id}`;
            return (
                <Switch>
                    <Route exact path={editPath} component={UserCreate}/>
                    <Route exact path={`${match.path}/edit_pwd`} component={UserEditPwd}/>
                    <Redirect to={editPath}/>
                </Switch>
            );
        }

        return (
            <Switch>
                <Route path={`${match.path}/list`} component={UserList}/>
                <Route path={`${match.path}/create`} component={UserCreate}/>
                <Route path={`${match.path}/edit/:id`} component={UserCreate}/>
                <Route path={`${match.path}/edit_pwd`} component={UserEditPwd}/>
                <Redirect to={`${match.path}/list`}/>
            </Switch>
        );
    }
}
