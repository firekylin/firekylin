import React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'mobx-react';

import routes from './routes';
import store from './app.store';

import './app.less';
import 'antd/dist/antd.css';

if (Object.freeze) {
    Object.freeze(window.SysConfig.userInfo);
}

ReactDOM.render(<Provider {...store}>{routes}</Provider>, document.getElementById(
    'app',
) as HTMLElement);
