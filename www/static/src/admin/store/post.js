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
  onSelect(id){
    let url = '/admin/api/post';
    if(id){
      url += '/' + id;
    }
    let req = superagent.get(url);
    return firekylin.request(req).then(
      data => this.trigger(data, id ? 'getPostInfo' : 'getPostList')
    );
  },
  onSelectList(page) {
    return firekylin.request( superagent.get('/admin/api/post?page='+page) ).then(
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
  onSave(data){
    let id = data.id;
    delete data.id;
    let url = '/admin/api/post';
    if(id){
      url += '/' + id + '?method=put';
    }
    let req = superagent.post(url);
    req.type('form').send(data);
    return firekylin.request(req).then(
      data => this.trigger(data, 'savePostSuccess'),
      err  => this.trigger(err, 'savePostFail')
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
  }

})
