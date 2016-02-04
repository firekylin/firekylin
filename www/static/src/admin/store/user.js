import Reflux from 'reflux';
import superagent from 'superagent';

import firekylin from '../../common/util/firekylin';

import UserAction from '../action/user';

export default Reflux.createStore({ 

  listenables: UserAction,
  /**
   * select user data
   * @param  {[type]} id [description]
   * @return {[type]}    [description]
   */
  onSelect(id){
    let url = '/admin/api/user';
    if(id){
      url += '/' + id;
    }
    let req = superagent.get('/admin/api/user');
    return firekylin.request(req).then(data => {
      this.trigger(data, id ? 'getUserInfo' : 'getUserList');
    }).catch(err => {
      
    })
  },
  /**
   * save user
   * @param  {Object} data []
   * @return {Promise}      []
   */
  onSave(data){
    let req = superagent.post('/admin/api/user/save');
    req.type('form').send(data);
    return firekylin.request(req).then(data => {
      this.trigger(data, 'saveUserSuccess');
    }).catch(err => {
      this.trigger(err, 'saveUserFail');
    })
  }

})