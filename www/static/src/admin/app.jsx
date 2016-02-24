import React from 'react';
import ReactDOM from 'react-dom';
import {Router, Route, Redirect, useRouterHistory} from 'react-router';

import {createHistory} from 'history';

import App from './component/app';
import Dashboard from './component/dashboard';
import Post from './component/post';
import User from './component/user';
import Cate from './component/cate';
import UserList from './component/user_list';
import UserCreate from './component/user_create';
import PostList from './component/post_list';
import PostCreate from './component/post_create';
import CateList from './component/cate_list';
import CateCreate from './component/cate_create';

let history = useRouterHistory(createHistory)({
  basename: '/admin',
  queryKey: false
});

ReactDOM.render((
  <Router history={history}>
    <Redirect from="/" to="dashboard" />
    <Route path="/" component={App}>
      <Route path="dashboard" component={Dashboard} />
      <Route path="post" component={Post}>
        <Redirect from="/" to="list" />
        <Route path="list" component={PostList} />
        <Route path="create" component={PostCreate} />
        <Route path="edit/:id" component={PostCreate} />
      </Route>
      <Route path="user" component={User}>
        <Redirect from="/" to="list" />
        <Route path="list" component={UserList} />
        <Route path="create" component={UserCreate} />
        <Route path="edit/:id" component={UserCreate} />
      </Route>
      <Route path="cate" component={Cate}>
        <Redirect from="/" to="list" />
        <Route path="list" component={CateList} />
        <Route path="create" component={CateCreate} />
        <Route path="edit/:id" component={CateCreate} />
      </Route>
    </Route>
  </Router>
  ),
  document.getElementById('app')
);
