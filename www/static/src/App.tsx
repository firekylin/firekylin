import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'mobx-react';
import './app.less';
import routes from './routes';
import AppStore from './store/app.store';
declare global {
    interface Window {
        SysConfig: {
            userInfo: any
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
