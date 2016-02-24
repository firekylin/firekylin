import React from 'react';
import Base from '../../common/component/base';
import {Link} from 'react-router';
import classnames from 'classnames';

export default class extends Base {
  render(){
    return (<div>{this.props.children}</div>)
  }
}
