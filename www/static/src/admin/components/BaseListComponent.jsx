import React from 'react';
import autobind from 'autobind-decorator';

import BaseComponent from './BaseComponent';


@autobind
class PostList extends BaseComponent {
  constructor(props) {
    super(props);

    this.state = {
      list: [],
      selected: []
    };
  }

  onListChange(list) {
    this.setState({list})
  }

  // 清除列表中已删除的分类
  clearList (ids) {

    for (let id of ids) {
      for (let i in this.state.list) {
        if (this.state.list[i].id === id) this.state.list.splice(i, 1);
      }
    }

    this.setState({list: this.state.list});
  }

  handleSelect(id) {
    let selected = this.state.selected;
    if (selected.includes(id)) {
      selected = selected.filter(t => t != id);
    } else {
      selected.push(id);
    }

    this.setState({ selected });
  }

  handleSelectAll() {
    let selected;

    if (this.state.list.length != this.state.selected.length) {
      selected = this.state.list.map(item => item.id);
    } else {
      selected = [];
    }

    this.setState({ selected });
  }

}

export default PostList