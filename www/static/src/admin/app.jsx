import React from 'react';
import ReactDOM from 'react-dom';
import {Router, Route, Redirect, useRouterHistory} from 'react-router';

import {createHistory} from 'history';

import App from './component/app';
import Dashboard from './component/dashboard';
import Post from './component/post';
import User from './component/user';
import UserList from './component/user_list';
import UserCreate from './component/user_create';


let history = useRouterHistory(createHistory)({
  basename: '/admin',
  queryKey: false
});

ReactDOM.render((
  <Router history={history}>
    <Redirect from="/" to="admin/dashboard" />
    <Route path="/" component={App}>
      <Route path="dashboard" component={Dashboard} />
      <Route path="post" component={Post} />
      <Route path="user" component={User}>
        <Redirect from="/" to="list" />
        <Route path="list" component={UserList} />
        <Route path="create" component={UserCreate} />
        <Route path="create/:id" component={UserCreate} />
      </Route>
    </Route>
  </Router>
  ),
  document.getElementById('app')
);
