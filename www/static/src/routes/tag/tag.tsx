import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router';
import { TagList } from './list/list';
import { TagProps } from './tag.model';
import TagCreateOrEdit from './create-or-edit/create-or-edit';

function Tag(props: TagProps) {
    const { match } = props;
    return (
        <>
            <Switch>
                <Route path={`${match.path}/list`} component={TagList}/>
                <Route path={`${match.path}/create`} component={TagCreateOrEdit}/>
                <Route path={`${match.path}/edit/:id`} component={TagCreateOrEdit}/>
                <Redirect to={`${match.path}/list`}/>
            </Switch>
        </>
    );
}

export default Tag;