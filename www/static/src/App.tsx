import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'mobx-react';

import routes from './routes';
import store from './app.store';

import './app.less';
import 'antd/dist/reset.css';

if (Object.freeze) {
    Object.freeze(window.SysConfig.userInfo);
}

createRoot(document.getElementById('app') as HTMLElement).render(
    <Provider {...store}>{routes}</Provider>,
);
