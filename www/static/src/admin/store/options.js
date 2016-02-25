import Reflux from 'reflux';
import superagent from 'superagent';

import firekylin from '../../common/util/firekylin';

import OptionsAction from '../action/options';

export default Reflux.createStore({ 

  listenables: OptionsAction,
  /**
   * save user
   * @param  {Object} data []
   * @return {Promise}      []
   */
  onSave(data){
    let req = superagent.post('/admin/api/options?method=put');
    req.type('form').send(data);
    return firekylin.request(req).then(data => {
      this.trigger(data, 'saveOptionsSuccess');
    }).catch(err => {
      this.trigger(err, 'saveOptionsFail');
    })
  }

})