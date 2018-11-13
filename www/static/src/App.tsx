import React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'mobx-react';
import './app.less';
import routes from './routes';
import store from './app.store';

if (Object.freeze) {
    Object.freeze(window.SysConfig.userInfo);
}

ReactDOM.render(<Provider {...store}>{routes}</Provider>, document.getElementById(
    'app',
) as HTMLElement);
