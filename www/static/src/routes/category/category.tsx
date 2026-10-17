import { Redirect, Route, Switch } from '@admin/utils/router';
import CategoryList from './list/list';
import CategoryCreate from './create/create';
import { CategoryProps } from './category.model';
export default function Category({ match }: CategoryProps) {
    return (
        <>
            <Switch>
                <Route path={`${match.path}/list`} component={CategoryList} />
                <Route path={`${match.path}/create`} component={CategoryCreate} />
                <Route path={`${match.path}/edit/:id`} component={CategoryCreate} />
                <Redirect to={`${match.path}/list`} />
            </Switch>
        </>
    );
}
