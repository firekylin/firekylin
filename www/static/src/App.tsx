import * as React from 'react';
import { Button } from 'antd';
import './App.scss';

class App extends React.Component {
  public render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src="./static/img/firekylin.jpg" className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <p className="App-intro">
          To get started, edit <code>src/App.tsx</code> and save to reload.
          <Button type="primary">Primary</Button>
        </p>
      </div>
    );
  }
}

export default App;
