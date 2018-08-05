import * as React from 'react';
import { Button } from 'antd';
import './index.scss';
import { observer, inject } from 'mobx-react';
import { IndexProps } from './index.model';

@inject('indexStore')
@observer class Index extends React.Component<IndexProps, any> {

  handleClick() {
    this.props.indexStore.setData('hello');
  }

  public render() {
      const { data } = this.props.indexStore;
      return (
        <div className="App">
          <header className="App-header">
            <img src="/static/img/firekylin.jpg" className="App-logo" alt="logo" />
            <h1 className="App-title">Welcome to React</h1>
          </header>
          <p className="App-intro">
            To get started, edit <code>src/App.tsx</code> and save to reload.
            <Button type="primary" onClick={() => this.handleClick()}>Primary</Button>
          </p>
          <p>Here is my mobx data: {data}</p>
        </div>
      );
  }
}

export default Index;
