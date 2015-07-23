import React from 'react';
import {RouteHandler} from 'react-router';

import TopBar from './TopBar';
import Navigation from './Navigation'


class App extends React.Component {
  render() {
    return (
        <div className="App">
          <TopBar />
          <div className="main">
            <Navigation />
            <RouteHandler />
          </div>
        </div>
    )
  }
}

export default App;
