import React from 'react';
import Base from 'base';

module.exports = class extends Base {
  render() {
    return (<div>{this.props.children}</div>)
  }
}
