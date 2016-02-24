import React from 'react';
import ReactDOM from 'react-dom';
import {Router, Route, Redirect, useRouterHistory} from 'react-router';

import {createHistory} from 'history';

import App from './component/app';
import Dashboard from './component/dashboard';

import User from './component/user';
import UserList from './component/user_list';
import UserCreate from './component/user_create';

import Post from './component/post';
import PostList from './component/post_list';
import PostCreate from './component/post_create';


import Options from './component/options';
import OptionsGeneral from './component/options_general';
import Options2fa from './component/options_2fa';
import OptionsUpload from './component/options_upload';

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
      <Route path="options" component={Options}>
        <Redirect from="/" to="general" />
        <Route path="general" component={OptionsGeneral} />
        <Route path="two_factor_auth" component={Options2fa} />
        <Route path="upload" component={OptionsUpload} />
      </Route>
    </Route>
  </Router>
  ),
  document.getElementById('app')
);
