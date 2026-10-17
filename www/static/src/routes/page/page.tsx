import { Redirect, Route, Switch } from '@admin/utils/router';
import PageList from './page-list/page-list';
import PageCreate from './page-create/page-create';

export default function Page({ match }: any) {
    return (
        <>
            <Switch>
                <Route path={`${match.path}/list`} component={PageList} />
                <Route path={`${match.path}/create`} component={PageCreate} />
                <Route path={`${match.path}/edit/:id`} component={PageCreate} />
                <Redirect to={`${match.path}/list`} />
            </Switch>
        </>
    );
}
