import Reflux from 'reflux';
import superagent from 'superagent';
import firekylin from 'common/util/firekylin';

import FileActions from 'common/action/file';

export default Reflux.createStore({

  listenables: FileActions,

  onUpload(data) {
    let form = new FormData();
    form.append('file', data);
    let url = '/admin/api/file';
    let req = superagent.post(url);
    req.send(form);
    return req.end(
      data => this.trigger(data, 'uploadSuccess')
    );
    // return firekylin.request(req).then(
    //   data => this.trigger(data, 'uploadSuccess'),
    //   err => this.trigger(err, 'uploadFail')
    // );
  }
});
