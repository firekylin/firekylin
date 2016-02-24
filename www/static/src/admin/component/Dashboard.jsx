import React from 'react';

export default class extends React.Component {
  render() {
    return (
      <div>
        <h3 style={{marginBottom: '30px'}}>网站概要</h3>
        <p>目前有 1 篇文章, 并有 1 条关于你的评论在 1 个分类中. </p>
        <p>点击下面的链接快速开始:</p>
        <hr />
        <div className="row">
          <div className="col-md-4">
            <h4>最近发布的文章</h4>
          </div>
          <div className="col-md-4">
            <h4>最近发布的评论</h4>
          </div>
          <div className="col-md-4">
            <h4>官方最新日志</h4>
            <ul>
              <li><a href=""> 参与下一个版本开发方向的投票</a></li>
              <li><a href=""> 参与下一个版本开发方向的投票</a></li>
              <li><a href=""> 参与下一个版本开发方向的投票</a></li>
              <li><a href=""> 参与下一个版本开发方向的投票</a></li>
              <li><a href=""> 参与下一个版本开发方向的投票</a></li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
}
