import Reflux from 'reflux';
import superagent from 'superagent';

import firekylin from '../../common/util/firekylin';

import PostAction from '../action/post';

export default Reflux.createStore({

  listenables: PostAction,
  /**
   * select user data
   * @param  {[type]} id [description]
   * @return {[type]}    [description]
   */
  onSelect(id) {
    let url = '/admin/api/post';
    if(id) {
      url += '/' + id;
    }
    let req = superagent.get(url);
    return firekylin.request(req).then(
      data => this.trigger(data, id ? 'getPostInfo' : 'getPostList')
    );
  },
  onSelectList(page, status, keyword, cate) {
    let url = `/admin/api/post?page=${page}`;
    if(status) { url += `&status=${status}` }
    if(keyword) { url += `&keyword=${keyword}`}
    if(cate) { url += `&cate=${cate}` }
    return firekylin.request(superagent.get(url)).then(
      data => this.trigger(data, 'getPostList')
    );
  },
  onSelectLastest() {
    let req = superagent.get('/admin/api/post/lastest');
    return firekylin.request(req).then(
      data => this.trigger(data, 'getPostLastest')
    );
  },
  /**
   * save user
   * @param  {Object} data []
   * @return {Promise}      []
   */
  onSave(data) {
    let id = data.id;
    delete data.id;
    let url = '/admin/api/post';
    if(id) {
      url += '/' + id + '?method=put';
    }
    let req = superagent.post(url);
    req.type('form').send(data);
    return firekylin.request(req).then(
      data => this.trigger(data, 'savePostSuccess'),
      err => this.trigger(err, 'savePostFail')
    );
  },

  onDelete(id) {
    let url = '/admin/api/post';
    if(id) {
      url += '/' + id + '?method=delete';
    }

    let req = superagent.post(url);
    return firekylin.request(req).then(
      data => this.trigger(data, 'deletePostSuccess'),
      err => this.trigger(err, 'deletePostFail')
    );
  },

  onPass({id, create_time}) {
    const postData = {id, status: 3};
    const {auditFreshCreateTime = '1'} = window.SysConfig.options;

    if (Number(auditFreshCreateTime)) {
      postData.create_time = create_time
    }

    this.onSave(postData);
  },

  onDeny(id) {
    this.onSave({id, status: 2});
  },

  onSearch(data) {
    let url = '/admin/api/search';
    let req = superagent.post(url);
    req.type('form').send(data);
    return firekylin.request(req).then((data)=>{
      //PostAction.search.completed(data);
      this.trigger(data, 'search')
    });
  }

})
