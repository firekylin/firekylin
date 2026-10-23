import {Redirect, Route, Switch} from '../../utils/router';
import type {RouteComponentProps} from '../../utils/router';
import AIAuditLogs from '../options/ai-logs/ai-logs';
import DataImport from '../options/import/import';
import DataExport from '../options/export/export';

export default function Tools({match}: RouteComponentProps) {
    return <Switch>
        <Route path={`${match.path}/ai-logs`} component={AIAuditLogs} />
        <Route path={`${match.path}/import`} component={DataImport} />
        <Route path={`${match.path}/export`} component={DataExport} />
        <Redirect to={`${match.path}/ai-logs`} />
    </Switch>;
}
