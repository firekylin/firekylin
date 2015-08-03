import React from 'react';
import {RouteHandler} from 'react-router';

import TopBar from './TopBar';
import Alert from './Alert';
import Navigation from './Navigation';


class App extends React.Component {
  render() {

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

export default App;
