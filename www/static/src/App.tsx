import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'mobx-react';
import './app.less';
import routes from './routes';
import store from './app.store';

declare global {
    interface Window {
        SysConfig: {
            userInfo: any,
            config: {
                disallow_file_edit: any;
            };
            options: {
                title: string;
                two_factor_auth: true;
                ldap_on: string;
                intranet: boolean;
                password_salt: string;
                theme: string;
                themeConfig: any;
                navigation: any;
                logo_url: string;
                favicon_url: string;
                description: string;
                site_url: string;
                keywords: string;
                github_url: string;
                twitter_url: string;
                miitbeian: string;
                mpsbeian: string;
                frontPagePage: string;
                frontPage: 'recent' | 'page';
                postTocManual: '0' | '1';
                auditFreshCreateTime: '0' | '1';
                postsListSize: number;
                auto_summary: number;
                feedFullText: '0' | '1';
            },
            token: string;
        };
    }
}

// interface WebpackRequire extends NodeRequire {
//     ensure(
//         dependencies: string[],
//         callback: (require: WebpackRequire) => void,
//         errorCallback?: (error: Error) => void,
//         chunkName?: string
//     ): void;
// };

if (Object.freeze) {
   Object.freeze(window.SysConfig.userInfo);
}

ReactDOM.render(
    <Provider {...store}>
        {routes}
    </Provider>,
    document.getElementById('app') as HTMLElement
);
