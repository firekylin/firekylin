import React from 'react';
import autobind from 'autobind-decorator';

import BaseComponent from './BaseComponent';
import AlertActions from '../actions/AlertActions';
import CategoryActions from '../actions/CategoryActions';
import {CategoryStatusStore} from '../stores/CategoryStores';


@autobind
class CategoryComposer extends BaseComponent {
  constructor(props) {
    super(props);

    this.state = {
      name: ''
    };
  }

  componentDidMount() {
    this.subscribe(
        CategoryStatusStore.listen(this.onStatusChange)
    )
  }

  render() {

    return (
        <div className="CategoryComposer">
          <form onSubmit={this.handleSave}>
          <input type="text" placeholder="请输入分类名" value={this.state.name} onChange={this.handleChange} />
          <div className="button-wrapper">
            <button type="submit" className="button green small" disabled={!this.state.name}><i className="fa fa-plus"></i>添加分类</button>
          </div>
          </form>
        </div>
    )
  }

  handleSave(e) {
    e.preventDefault();
    CategoryActions.add({name: this.state.name});
  }

  handleChange(e) {
    this.setState({
      name: e.target.value
    });
  }

  onStatusChange(status, message) {
    if (status == 'complete') {
      AlertActions.success('分类创建成功');
      this.setState({name: ''})
    } else {
      AlertActions.error('分类创建失败: ' + message);
    }
  }
}

export default CategoryComposer;