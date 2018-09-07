import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router';
import PageList from './page-list/page-list';
import PageCreate from './page-create/page-create';

export default class Page extends React.Component<any, any> {
    render() {
        const { match } = this.props;
        return (
            <>
                <Switch>
                    <Route path={`${match.path}/list`} component={PageList}/>
                    <Route path={`${match.path}/create`} component={PageCreate}/>
                    <Route path={`${match.path}/edit/:id`} component={PageCreate}/>
                    <Redirect to={`${match.path}/list`}/>
                </Switch>
            </>
        );
    }
}