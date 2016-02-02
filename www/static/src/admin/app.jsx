import React from 'react';
import ReactDOM from 'react-dom';
import {Router, Route, Redirect, browserHistory} from 'react-router';

import App from './component/app';
import Dashboard from './component/dashboard';
import Post from './component/post';

ReactDOM.render((
  <Router history={browserHistory}>
    <Redirect from="/" to="/dashboard" />
    <Route path="/" component={App}>
      <Route path="dashboard" component={Dashboard} />
      <Route path="post" component={Post} />
    </Route>
  </Router>
  ),
  document.getElementById('app')
);
