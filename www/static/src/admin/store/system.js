import Reflux from 'reflux';
import superagent from 'superagent';
import firekylin from '../../common/util/firekylin';
import SystemAction from 'admin/action/system';

export default Reflux.createStore({

  listenables: SystemAction,
  /**
   * select user data
   * @param  {[type]} id [description]
   * @return {[type]}    [description]
   */
  onSelect() {
    let url = '/admin/api/system';
    let req = superagent.get(url);
    return firekylin.request(req).then(
      data => this.trigger(data, 'getSystemInfo')
    );
  },
  onUpdateSystem(step) {
    let url = '/admin/api/system?method=update&step='+step;
    let req = superagent.get(url);
    return firekylin.request(req).then(
      () => this.trigger(null, 'updateSystem')
    );
  }
})
