import React from 'react';
import ReactDom from 'react-dom';
import Base from '../../common/component/base';
import {Link} from 'react-router';
import classnames from 'classnames';
import { Form, ValidatedInput } from 'react-bootstrap-validation';
import md5 from 'md5';

export default class extends Base {
  render(){
    return (<div>
      <h3>二步认证</h3>
    </div>);
  }
}