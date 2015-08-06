import React from 'react';
import {RouteHandler, State as RouterState} from 'react-router';
import {decorate as mixin} from 'react-mixin';

import TopBar from './TopBar';
import Alert from './Alert';
import Navigation from './Navigation';


@mixin(RouterState)
class App extends React.Component {
  render() {

    if (this.isActive('login')) {
      return (
          <RouteHandler />
      );
    } else {

      return (
          <div className="App">
            <TopBar />
            <div className="main">
              <Navigation />
              <div className="page-wrapper">
                <Alert />
                <RouteHandler />
              </div>
            </div>
          </div>
      )
    }

  }
}

export default App;
