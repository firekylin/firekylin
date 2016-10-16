import React from 'react';
import ReactDOM from 'react-dom';
import 'babel-polyfill';
import {Router, Route, Redirect, useRouterHistory} from 'react-router';

import {createHistory} from 'history';

import App from './component/App';
import Dashboard from './component/Dashboard';

import User from './component/user';
import UserList from './component/user_list';
import UserCreate from './component/user_create';
import UserEditPwd from './component/user_editpwd.jsx';

import Post from './component/post';
import PostList from './component/post_list';
import PostCreate from './component/post_create';

import Page from './component/page';
import PageList from './component/page_list';
import PageCreate from './component/page_create';

import Cate from './component/cate';
import CateList from './component/cate_list';
import CateCreate from './component/cate_create';

import Tag from './component/tag';
import TagList from './component/tag_list';
import TagCreate from './component/tag_create';

import Push from './component/push';
import PushList from './component/push_list';
import PushCreate from './component/push_create';

import Appearance from './component/appearance';
import Theme from './component/theme';
import Navigation from './component/navigation';

import Options from './component/options';
import OptionsGeneral from './component/options_general';
import Options2fa from './component/options_2fa';
import OptionsComment from './component/options_comment';
import Import from './component/import';
import OptionsAnalytic from './component/options_analytic';
import OptionsPush from './component/options_push';

if( Object.freeze ) {
  Object.freeze(window.SysConfig.userInfo);
}

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
      <Route path="page" component={Page}>
        <Redirect from="/" to="list" />
        <Route path="list" component={PageList} />
        <Route path="create" component={PageCreate} />
        <Route path="edit/:id" component={PageCreate} />
      </Route>
      <Route path="user" component={User}>
        <Redirect from="/" to="list" />
        <Route path="list" component={UserList} />
        <Route path="create" component={UserCreate} />
        <Route path="edit_pwd" component={UserEditPwd} />
        <Route path="edit/:id" component={UserCreate} />
      </Route>
      <Route path="cate" component={Cate}>
        <Redirect from="/" to="list" />
        <Route path="list" component={CateList} />
        <Route path="create" component={CateCreate} />
        <Route path="edit/:id" component={CateCreate} />
      </Route>
      <Route path="tag" component={Tag}>
        <Redirect from="/" to="list" />
        <Route path="list" component={TagList} />
        <Route path="create" component={TagCreate} />
        <Route path="edit/:id" component={TagCreate} />
      </Route>
      <Route path="push" component={Push}>
        <Redirect from="/" to="list" />
        <Route path="list" component={PushList} />
        <Route path="create" component={PushCreate} />
        <Route path="edit/:id" component={PushCreate} />
      </Route>
      <Route path="appearance" component={Appearance}>
        <Redirect from="/" to="theme" />
        <Route path="theme" component={Theme} />
        <Route path="navigation" component={Navigation} />
      </Route>
      <Route path="options" component={Options}>
        <Redirect from="/" to="general" />
        <Route path="general" component={OptionsGeneral} />
        <Route path="two_factor_auth" component={Options2fa} />
        <Route path="comment" component={OptionsComment} />
        <Route path="analytic" component={OptionsAnalytic} />
        <Route path="push" component={OptionsPush} />
        <Route path="import" component={Import} />
      </Route>
    </Route>
  </Router>
  ),
  document.getElementById('app')
);
