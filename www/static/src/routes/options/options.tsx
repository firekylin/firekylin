import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router';
import { OptionsProps } from './options.model';
import General from './general/general';

export default class Options extends React.Component<OptionsProps, any> {
    render() {
        const { match } = this.props;
        return (
            <>
                <Switch>
                    <Route path={`${match.path}/general`} component={General}/>
                    <Redirect to={`${match.path}/general`}/>
                </Switch>
            </>
        );
    }
}