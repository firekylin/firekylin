import { Redirect, Route, Switch } from '@admin/utils/router';
import Theme from './theme/theme';
import ThemeMarket from './theme/market';
import { AppearanceProps } from './appearance.model';
import Navigation from './navigation/navigation';
import Edit from './edit/edit';
export default function Appearance({ match }: AppearanceProps) {
    return (
        <>
            <Switch>
                <Route path={`${match.path}/install-theme`} component={ThemeMarket} />
                <Route path={`${match.path}/theme`} component={Theme} />
                <Route path={`${match.path}/navigation`} component={Navigation} />
                <Route path={`${match.path}/edit`} component={Edit} />
                <Redirect to={`${match.path}/theme`} />
            </Switch>
        </>
    );
}
