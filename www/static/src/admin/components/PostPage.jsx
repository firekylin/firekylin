import React from 'react';
import {Link} from 'react-router';

import PostList from './PostList';


export default class PostPage extends React.Component {
  render() {
    return (
      <div className="PostPage page">
        <div className="title">
          <h2>文章管理</h2>
          <Link to="post/add" className="add-post button lightblue x-small">写文章</Link>
        </div>
        <PostList />
      </div>
    )
  }
}