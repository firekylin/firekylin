import React from 'react';
import autobind from 'autobind-decorator';
import { History } from 'react-router';
import { decorate as mixin } from 'react-mixin';

import TopBar from './TopBar';
import Alert from './Alert';
import Navigation from './Navigation';
import UserActions from '../actions/UserActions';
import { UserStore } from '../stores/UserStores';


@autobind
@mixin(History)
class App extends React.Component {
  constructor(props) {
    super(props);

    UserActions.check();

    this.state = {
      userInfo: null
    };

    UserStore.listen(this.onUserChange);
  }
  render() {
    if (this.state.userInfo) {
      return (
          <div className="App">
            <TopBar userInfo={ this.state.userInfo }/>
            <div className="main">
              <Navigation location={ this.props.location } />
              <div className="page-wrapper">
                <Alert />
                { this.props.children }
              </div>
            </div>
          </div>
      );
    } else {
      return (<div>Loading...</div>)
    }
  }

  onUserChange(userInfo) {
    if (userInfo) {
      this.setState({ userInfo });
    } else {
      this.history.replaceState({}, '/admin/login');
    }
  }
}

export default App;
