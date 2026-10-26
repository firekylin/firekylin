import { Redirect, Route, Switch } from '@admin/utils/router';
import { OptionsProps } from './options.model';
import General from './general/general';
import Reading from './reading/reading';
import TwoFactorAuth from './two-factor-auth/two-factor-auth';
import LDAP from './ldap/ldap';
import Captcha from './captcha/captcha';
import Comment from './comment/comment';
import Analysis from './analysis/analysis';
import OptionsPush from './push/push';
import OptionsUpload from './upload/upload';
import SmartContentSettings from './smart-content/smart-content';
import AIConnections from '../plugin/ai-connections';

export default function Options({ match }: OptionsProps) {
    return (
        <>
            <Switch>
                <Route path={`${match.path}/general`} component={General} />
                <Route path={`${match.path}/reading`} component={Reading} />
                <Route path={`${match.path}/smart-content`} component={SmartContentSettings} />
                <Route path={`${match.path}/ai`} component={AIConnections} />
                <Route path={`${match.path}/two_factor_auth`} component={TwoFactorAuth} />
                <Route path={`${match.path}/ldap`} component={LDAP} />
                <Route path={`${match.path}/captcha`} component={Captcha} />
                <Route path={`${match.path}/comment`} component={Comment} />
                <Route path={`${match.path}/analytic`} component={Analysis} />
                <Route path={`${match.path}/push`} component={OptionsPush} />
                <Route path={`${match.path}/upload`} component={OptionsUpload} />
                 <Redirect to={`${match.path}/general`} />
            </Switch>
        </>
    );
}
