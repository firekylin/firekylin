import React from 'react';
import autobind from 'autobind-decorator';

import BaseComponent from './BaseComponent';
import {DialogModalStore} from '../stores/DialogStores';


const DEFAULT_TIMEOUT = 3000;

@autobind
class Dialog extends BaseComponent {

  constructor(props) {
    super(props);

    this.state = {
      show: false,
      message: '',
      showClose: false
    };
  }

  componentDidMount() {
    this.subscribe(
        DialogModalStore.listen(this.onChange)
    );
  }

  render() {
    return (
        <div className="Dialog">
          <div className="mask"></div>
          <div className="modal"></div>
        </div>
    )
  }

  onChange(type, message, opts = {}) {

    if (message) {
      this.setState({
        show: true,
        type,
        message,
        showClose: !!opts.showClose
      });

      if (!opts.showClose) {
        setTimeout(() => {
          this.state.message == message && this.handleClose();
        }, opts.timeout || DEFAULT_TIMEOUT)
      }

    }
  }

  handleClose() {
    this.setState({ show: false });
  }
}

export default Alert