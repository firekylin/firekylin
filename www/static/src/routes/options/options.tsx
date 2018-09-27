import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router';
import { OptionsProps } from './options.model';
import General from './general/general';
import Reading from './reading/reading';

export default class Options extends React.Component<OptionsProps, any> {
    render() {
        const { match } = this.props;
        return (
            <>
                <Switch>
                    <Route path={`${match.path}/general`} component={General}/>
                    <Route path={`${match.path}/reading`} component={Reading}/>
                    <Redirect to={`${match.path}/general`}/>
                </Switch>
            </>
        );
    }
}