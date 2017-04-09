import Reflux from 'reflux';
import superagent from 'superagent';
import PushAction from '../action/push';
import firekylin from 'common/util/firekylin';

export default Reflux.createStore({

  listenables: PushAction,
  /**
   * select user data
   * @param  {[type]} id [description]
   * @return {[type]}    [description]
   */
  onSelect(id) {
    let url = '/admin/api/options?type=push';
    if(id) { url += `&key=${id}`; }
    let req = superagent.get(url);
    return firekylin.request(req).then(
      data => this.trigger(data, id ? 'getPushInfo' : 'getPushList')
    );
  },

  onSave(data) {
    let url = '/admin/api/options?method=put&type=push';
    let req = superagent.post(url);
    req.type('form').send(data);
    return firekylin.request(req).then(
      data => this.trigger(data, 'savePushSuccess'),
      err => this.trigger(err, 'savePushFailed')
    );
  },

  onDelete(id) {
    let url = '/admin/api/options?method=delete&type=push';
    if(id) {
      url += `&key=${id}`;
    }

    let req = superagent.post(url);
    return firekylin.request(req).then(
      data => this.trigger(data, 'deletePushSuccess'),
      err => this.trigger(err, 'deletePushFail')
    );
  }

})
