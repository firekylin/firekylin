import React from 'react';

import BaseComponent from './BaseComponent';
import PostList from './PostList';


export default class PostPage extends BaseComponent {
  render() {
    return (
      <div className="PostPage page">
        <div className="title">
          <h2>文章管理</h2>
        </div>
        <PostList />
      </div>
    )
  }
}