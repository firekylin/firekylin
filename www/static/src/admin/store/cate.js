import Reflux from 'reflux';
import superagent from 'superagent';

import firekylin from '../../common/util/firekylin';

import CateAction from '../action/cate';

export default Reflux.createStore({

  listenables: CateAction,
  /**
   * select user data
   * @param  {[type]} id [description]
   * @return {[type]}    [description]
   */
  onSelect(id){
    let url = '/admin/api/cate';
    if(id){
      url += '/' + id;
    }
    let req = superagent.get(url);
    return firekylin.request(req).then(
      data => this.trigger(data, id ? 'getCateInfo' : 'getCateList')
    );
  },
  onSelectParent() {
    let url = '/admin/api/cate?pid=0';
    let req = superagent.get(url);
    return firekylin.request(req).then(
      data => this.trigger(data, 'getCateParent')
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
    let url = '/admin/api/cate';
    if(id){
      url += '/' + id + '?method=put';
    }
    let req = superagent.post(url);
    req.type('form').send(data);
    return firekylin.request(req).then(
      data => {
        if(data.id && data.id.type === 'exist') {
          this.trigger('CATE_EXIST', 'saveCateFail');
        } else this.trigger(data, 'saveCateSuccess');
      },
      err  => this.trigger(err, 'saveCateFail')
    );
  },

  onDelete(id) {
    let url = '/admin/api/cate';
    if(id) {
      url += '/' + id + '?method=delete';
    }

    let req = superagent.post(url);
    return firekylin.request(req).then(
      data => this.trigger(data, 'deleteCateSuccess'),
      err => this.trigger(err, 'deleteCateFail')
    );
  }

})
