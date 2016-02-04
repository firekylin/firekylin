import React from 'react';
import Base from './base';

import TipStore from '../store/tip';

/**
 * 通用Tip
 */
export default class extends Base {

  componentDidMount(){
    this.listenTo(TipStore, this.change.bind(this));
  }
  /**
   * data : {type: 'success', text: ''}
   * @param  {[type]} data [description]
   * @return {[type]}      [description]
   */
  change(data){
    this.setState(data);
  }

  render(){
    if(this.state.isOpen){
      let className = 'fk-alert alert alert-' + this.state.type;
      return (
        <div className={className}>
          {this.state.text}
        </div>
      );
    }else{
      return (<div></div>);
    }
  }
}