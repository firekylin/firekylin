import { Redirect, Route, Switch } from '@admin/utils/router';
import type {RouteComponentProps} from '@admin/utils/router';
import AIAuditLogs from './ai-logs/ai-logs';
import DataImport from './import/import';
import DataExport from './export/export';

export default function Tools({match}: RouteComponentProps) {
    return <Switch>
        <Route path={`${match.path}/ai-logs`} component={AIAuditLogs} />
        <Route path={`${match.path}/import`} component={DataImport} />
        <Route path={`${match.path}/export`} component={DataExport} />
        <Redirect to={`${match.path}/ai-logs`} />
    </Switch>;
}
