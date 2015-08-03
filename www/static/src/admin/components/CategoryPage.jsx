import React from 'react';

import BaseComponent from './BaseComponent';
import CategoryList from './CategoryList';
import CategoryComposer from './CategoryComposer';

export default class CategoryPage extends BaseComponent {
  render() {
    return (
        <div className="PostPage page">
          <div className="title">
            <h2>分类管理</h2>
          </div>
          <CategoryList />
          <CategoryComposer />
        </div>
    )
  }
}