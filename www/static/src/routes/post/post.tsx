import { Redirect, Route, Switch } from '@admin/utils/router';
import PostList from './list/list';
import PostCreate from './create/create';
import { PostProps } from './post.model';

export default function Post({ match }: PostProps) {
    return (
        <>
            <Switch>
                <Route path={`${match.path}/list`} component={PostList} />
                <Route path={`${match.path}/create`} component={PostCreate} />
                <Route path={`${match.path}/edit/:id`} component={PostCreate} />
                <Redirect to={`${match.path}/list`} />
            </Switch>
        </>
    );
}
