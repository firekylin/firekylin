import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router';
import { OptionsProps } from './options.model';
import General from './general/general';
import Reading from './reading/reading';
import TwoFactorAuth from './two-factor-auth/two-factor-auth';

export default class Options extends React.Component<OptionsProps, any> {
    render() {
        const { match } = this.props;
        return (
            <>
                <Switch>
                    <Route path={`${match.path}/general`} component={General}/>
                    <Route path={`${match.path}/reading`} component={Reading}/>
                    <Route path={`${match.path}/two_factor_auth`} component={TwoFactorAuth}/>
                    <Redirect to={`${match.path}/general`}/>
                </Switch>
            </>
        );
    }
}