import Reflux from 'reflux';
import superagent from 'superagent';

import firekylin from '../../common/util/firekylin';

import UserAction from '../action/user';

export default Reflux.createStore({ 

  listenables: UserAction,
  /**
   * save user
   * @param  {Object} data []
   * @return {Promise}      []
   */
  onSave(data){
    let req = superagent.post('/admin/user/save');
    req.type('form').send(data);
    return firekylin.request(req).then(data => {
      UserAction.save.completed(data);
    }).catch(err => {
      UserAction.save.failed(err);
    })
  }

})