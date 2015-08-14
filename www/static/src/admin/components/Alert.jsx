import React from 'react';
import autobind from 'autobind-decorator';

import BaseComponent from './BaseComponent';
import {AlertStore} from '../stores/AlertStores';


const DEFAULT_TIMEOUT = 3000;

@autobind
class Alert extends BaseComponent {

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
        AlertStore.listen(this.onChange)
    );
  }

  render() {

    let close = !this.state.showClose ? '' : (
      <i className="fa fa-times close" onClick={this.handleClose} />
    );

    let className = `inner ${this.state.type}`;

    return (
        <div className='Alert' style={{display: this.state.show ? 'block' : 'none'}}>
          <div className={className}>
            {this.state.message}
            {close}
          </div>
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

      clearTimeout(this.timer);

      if (!opts.showClose) {
        this.timer = setTimeout(() => this.handleClose(), opts.timeout || DEFAULT_TIMEOUT);
      }

    }
  }

  handleClose() {
    this.setState({ show: false });
  }
}

export default Alert