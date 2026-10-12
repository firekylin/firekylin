import React from 'react';
import { createRoot } from 'react-dom/client';
import { configureStores } from '@admin/utils/mobx-react';

import routes from './routes';
import store from './app.store';

import './app.less';
import 'antd/dist/reset.css';

if (Object.freeze) {
    Object.freeze(window.SysConfig.userInfo);
}

configureStores(store);
createRoot(document.getElementById('app') as HTMLElement).render(routes);
