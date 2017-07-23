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
  onSelect(id, filter) {
    let url = '/admin/api/user';
    if(id) {
      url += '/' + id;
    }
    if(filter) {
      url += '?type='+filter;
    }
    let req = superagent.get(url);
    return firekylin.request(req).then(data => {
      this.trigger(data, id ? 'getUserInfo' : 'getUserList');
    }).catch(() => {

    })
  },
  /**
   * save user
   * @param  {Object} data []
   * @return {Promise}      []
   */
  onSave(data) {
    let id = data.id;
    delete data.id;
    let url = '/admin/api/user';
    if(id) {
      url += '/' + id + '?method=put';
    }
    let req = superagent.post(url);
    req.type('form').send(data);
    return firekylin.request(req).then(data => {
      this.trigger(data, 'saveUserSuccess');
    }).catch(err => {
      this.trigger(err, 'saveUserFail');
    })
  },
  onSavepwd(data) {
    let url = '/admin/user/password';
    let req = superagent.post(url);
    req.type('form').send(data);
    return firekylin.request(req).then(data => {
      this.trigger(data, 'saveUserSuccess');
    }).catch(err => {
      this.trigger(err, 'saveUserFail');
    })
  },
  /**
   * login
   * @param  {[type]} data [description]
   * @return {[type]}      [description]
   */
  onLogin(data) {
    let req = superagent.post('/admin/user/login');
    req.type('form').send(data);
    return firekylin.request(req).then(data => {
      this.trigger(data, 'LoginSuccess');
    }).catch(err => {
      this.trigger(err, 'LoginFail');
    })
  },

  onForgot(data) {
    let req = superagent.post('/admin/user/forgot');
    req.type('form').send(data);
    return firekylin.request(req).then(
      data => this.trigger(data, 'forgotSuccess')
    ).catch(
      err => this.trigger(err, 'forgotFail')
    );
  },

  onReset(data) {
    let req = superagent.post('/admin/user/reset');
    req.type('form').send(data);
    return firekylin.request(req).then(
      data => this.trigger(data, 'resetSuccess')
    ).catch(
      err => this.trigger(err, 'resetFail')
    );
  },

  onDelete(userId) {
    let url = '/admin/api/user/' + userId + '?method=delete';
    let req = superagent.post(url);
    req.type('form').send();
    return firekylin.request(req).then(data => {
      this.trigger(data, 'deleteUserSuccess');
    }).catch(err => {
      this.trigger(err, 'deleteUserFail');
    })
  },

  onPass(userId) {
    let url = '/admin/api/user/' + userId + '?method=put&type=contributor';
    let req = superagent.post(url);
    req.type('form').send();
    return firekylin.request(req).then(
      data => this.trigger(data, 'passUserSuccess'),
      err => this.trigger(err, 'passUserFailed')
    );
  },

  onGenerateKey(userId) {
    let url = '/admin/api/user/' + userId + '?type=key';
    let req = superagent.post(url);
    req.type('form').send();
    return firekylin.request(req).then(
      data => this.trigger(data, 'getUserInfo'),
      err => this.trigger(err, 'getUserInfoFailed')
    );
  }
})
