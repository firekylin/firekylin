import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router';
import Theme from './theme/theme';
import { AppearanceProps } from './appearance.model';
export default class Appearance extends React.Component<AppearanceProps, any> {
    render() {
        const { match } = this.props;
        return (
            <>
                <Switch>
                    <Route path={`${match.path}/theme`} component={Theme}/>
                    <Redirect to={`${match.path}/theme`}/>
                </Switch>
            </>
        );
    }
}