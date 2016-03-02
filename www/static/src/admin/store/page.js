import Reflux from 'reflux';
import superagent from 'superagent';
import firekylin from 'common/util/firekylin';

import PageAction from '../action/page';

export default Reflux.createStore({

  listenables: PageAction,
  /**
   * select user data
   * @param  {[type]} id [description]
   * @return {[type]}    [description]
   */
  onSelect(id){
    let url = '/admin/api/page';
    if(id){
      url += '/' + id;
    }
    let req = superagent.get(url);
    return firekylin.request(req).then(
      data => this.trigger(data, id ? 'getPageInfo' : 'getPageList')
    );
  },
  onSelectList(page) {
    return firekylin.request( superagent.get('/admin/api/page?page='+page) ).then(
      data => this.trigger(data, 'getPageList')
    );
  },

  onSave(data){
    let id = data.id;
    delete data.id;
    let url = '/admin/api/page';
    if(id){
      url += '/' + id + '?method=put';
    }
    let req = superagent.post(url);
    req.type('form').send(data);
    return firekylin.request(req).then(
      data => this.trigger(data, 'savePageSuccess'),
      err  => this.trigger(err, 'savePageFail')
    );
  },

  onDelete(id) {
    let url = '/admin/api/page';
    if(id) {
      url += '/' + id + '?method=delete';
    }

    let req = superagent.post(url);
    return firekylin.request(req).then(
      data => this.trigger(data, 'deletePageSuccess'),
      err => this.trigger(err, 'deletePageFail')
    );
  }

})
