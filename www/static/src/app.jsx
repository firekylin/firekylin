'use strict';

import React from 'react';
import Router from'react-router';

import firekylin from './common/firekylin.jsx';
import Header from './admin/header.jsx';
import Home from './admin/home.jsx';

import PostItem from './admin/post/item.jsx';

let Route = Router.Route;
let RouteHandler = Router.RouteHandler;
let DefaultRoute = Router.DefaultRoute;

let {Tip} = firekylin;

let App = class extends React.Component {
  render () {
    return (
      <div>
        <Header />
        <Tip />
        <RouteHandler/>
      </div>
    )
  }
};
let routes = (
  <Route path="/" handler={App}>
    <DefaultRoute handler={Home} name="home" />
    <Route path="post/item" name="post/item" handler={PostItem} />
  </Route>
);
$(function(){
  Router.run(routes, Router.HashLocation, (Root) => {
    React.render(<Root/>, document.body);
  });
})
