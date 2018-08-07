import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'mobx-react';
import './app.less';
import routes from './routes';
import AppStore from './app.store';
declare global {
    interface Window {
        SysConfig: {
            userInfo: any,
            config: {
                disallow_file_edit: any;
            };
            options: {
                title: string;
            }
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
    <Provider {...AppStore}>
        {routes}
    </Provider>,
    document.getElementById('app') as HTMLElement
);
