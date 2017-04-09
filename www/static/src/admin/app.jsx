import React from 'react';
import ReactDOM from 'react-dom';
import 'babel-polyfill';
import {Router, useRouterHistory} from 'react-router';

import {createHistory} from 'history';

if(Object.freeze) {
  Object.freeze(window.SysConfig.userInfo);
}

let history = useRouterHistory(createHistory)({
  basename: '/admin',
  queryKey: false
});

let rootRoute = {
  path: '/',
  indexRoute: {
    onEnter: (nextState, replace) => replace('/dashboard')
  },
  getChildRoutes(location, callback) {
    require.ensure([], function(require) {
      callback(null, [
        require('./page/tag'),
        require('./page/post'),
        require('./page/page'),
        require('./page/user'),
        require('./page/push'),
        require('./page/cate'),
        require('./page/options'),
        require('./page/dashboard'),
        require('./page/appearance')
      ]);
    }, 'app');
  },
  getComponent(location, callback) {
    callback(null, require('./component/App'));
  }
};

ReactDOM.render(
  <Router history={history} routes={rootRoute} />,
  document.getElementById('app')
);
