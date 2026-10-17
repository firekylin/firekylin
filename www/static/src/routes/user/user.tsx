import UserList from './user_list/user_list';
import UserCreate from './user_create/user_create';
import UserEditPwd from './user_edit_pwd/user_edit_pwd';
import { Redirect, Route, Switch } from '@admin/utils/router';
import { UserProps } from './user.model';

export default function User({ match }: UserProps) {
    return (
        <Switch>
            <Route path={`${match.path}/list`} component={UserList} />
            <Route path={`${match.path}/create`} component={UserCreate} />
            <Route path={`${match.path}/edit/:id`} component={UserCreate} />
            <Route path={`${match.path}/edit_pwd`} component={UserEditPwd} />
            <Redirect to={`${match.path}/list`} />
        </Switch>
    );
}
