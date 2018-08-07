import * as React from 'react';
import { Button } from 'antd';
import './dashboard.less';
import { observer, inject } from 'mobx-react';
import { DashBoardProps } from './dashboard.model';
import BreadCrumb from '../../components/breadcrumb';

@inject('dashBoardStore')
@observer class Index extends React.Component<DashBoardProps, any> {

  handleClick() {
    this.props.dashBoardStore.setData('hello');
  }

  public render() {
      const { data } = this.props.dashBoardStore;
      return (
        <div className="App">
          <BreadCrumb {...this.props} />
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
