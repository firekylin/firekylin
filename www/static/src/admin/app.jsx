import 'babel-core/polyfill'

import React from 'react';
import { Router, Route, Redirect } from 'react-router';
import { history } from 'react-router/lib/BrowserHistory';

import App from './components/App';
import UserPage from './components/UserPage';
import PostPage from './components/PostPage';
import LoginPage from './components/LoginPage';
import ConfigPage from './components/ConfigPage';
import PostEditPage from './components/PostEditPage';
import CategoryPage from './components/CategoryPage';
import DashBoardPage from './components/DashBoardPage';

import './stores/WebAPIStores';


new Promise(resolve => {
  if (window.addEventListener) {
    window.addEventListener('DOMContentLoaded', resolve);
  } else {
    window.attachEvent('onload', resolve);
  }
}).then(() => {
  React.render((
      <Router history={ history }>
        <Route path="/admin/login" component={ LoginPage } />
        <Redirect from="/admin" to="/admin/dashboard" />
        <Route path="/admin" component={ App } onEnter={ requireAuth }>
          <Route path="dashboard" component={ DashBoardPage } />
          <Route path="category" component={ CategoryPage } />
          <Route path="post" component={ PostPage} />
          <Route path="post/add" component={ PostEditPage } />
          <Route path="post/edit/:id" component={ PostEditPage } />
          <Route path="user" component={ UserPage } />
          <Route path="config" component={ ConfigPage } />
          <Redirect from="*" to="/admin/dashboard" />
        </Route>
      </Router>
  ), document.body);
});

function requireAuth(nextState, transition) {}