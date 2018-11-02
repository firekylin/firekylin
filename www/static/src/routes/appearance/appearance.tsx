import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router';
import Theme from './theme/theme';
import { AppearanceProps } from './appearance.model';
import Navigation from './navigation/navigation';
import Edit from './edit/edit';
export default class Appearance extends React.Component<AppearanceProps, any> {
    render() {
        const { match } = this.props;
        return (
            <>
                <Switch>
                    <Route path={`${match.path}/theme`} component={Theme}/>
                    <Route path={`${match.path}/navigation`} component={Navigation}/>
                    <Route path={`${match.path}/edit`} component={Edit}/>
                    <Redirect to={`${match.path}/theme`}/>
                </Switch>
            </>
        );
    }
}