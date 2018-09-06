import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router';
import PageList from './page-list/page-list';

export default class Page extends React.Component<any, any> {
    render() {
        const { match } = this.props;
        return (
            <>
                <Switch>
                    <Route path={`${match.path}/list`} component={PageList}/>
                    {/* <Route path={`${match.path}/create`} component={PostCreate}/> */}
                    {/* <Route path={`${match.path}/edit/:id`} component={PostCreate}/> */}
                    <Redirect to={`${match.path}/list`}/>
                </Switch>
            </>
        );
    }
}