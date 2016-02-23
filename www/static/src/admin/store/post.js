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
  }

})
