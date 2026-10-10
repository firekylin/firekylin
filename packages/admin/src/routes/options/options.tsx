import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router';
import { OptionsProps } from './options.model';
import General from './general/general';
import Reading from './reading/reading';
import TwoFactorAuth from './two-factor-auth/two-factor-auth';
import LDAP from './ldap/ldap';
import Comment from './comment/comment';
import Analysis from './analysis/analysis';
import OptionsPush from './push/push';
import OptionsExport from './export/export';
import OptionsUpload from './upload/upload';
import OptionsImport from './import/import';

export default class Options extends React.Component<OptionsProps, any> {
    render() {
        const { match } = this.props;
        return (
            <>
                <Switch>
                    <Route path={`${match.path}/general`} component={General}/>
                    <Route path={`${match.path}/reading`} component={Reading}/>
                    <Route path={`${match.path}/two_factor_auth`} component={TwoFactorAuth}/>
                    <Route path={`${match.path}/ldap`} component={LDAP}/>
                    <Route path={`${match.path}/comment`} component={Comment}/>
                    <Route path={`${match.path}/analytic`} component={Analysis}/>
                    <Route path={`${match.path}/push`} component={OptionsPush}/>
                    <Route path={`${match.path}/export`} component={OptionsExport}/>
                    <Route path={`${match.path}/upload`} component={OptionsUpload}/>
                    <Route path={`${match.path}/import`} component={OptionsImport}/>
                    <Redirect to={`${match.path}/general`}/>
                </Switch>
            </>
        );
    }
}