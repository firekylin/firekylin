import Reflux from 'reflux';
import superagent from 'superagent';
import firekylin from 'common/util/firekylin';
import TagAction from 'admin/action/tag';

export default Reflux.createStore({
  listenables: TagAction,

  onSelect(id){
    let url = '/admin/api/tag';
    if(id){
      url += '/' + id;
    }
    let req = superagent.get(url);
    return firekylin.request(req).then(
      data => this.trigger(data, id ? 'getTagInfo' : 'getTagList')
    );
  },

  onSave(data){
    let id = data.id;
    delete data.id;
    let url = '/admin/api/tag';
    if(id){
      url += '/' + id + '?method=put';
    }
    let req = superagent.post(url);
    req.type('form').send(data);
    return firekylin.request(req).then(
      data => {
        if(data.id && data.id.type === 'exist') {
          this.trigger('TAG_EXIST', 'saveTagFail');
        } else this.trigger(data, 'saveTagSuccess');
      },
      err  => this.trigger(err, 'saveTagFail')
    );
  },

  onDelete(id) {
    let url = '/admin/api/tag';
    if(id) {
      url += '/' + id + '?method=delete';
    }

    let req = superagent.post(url);
    return firekylin.request(req).then(
      data => this.trigger(data, 'deleteTagSuccess'),
      err => this.trigger(err, 'deleteTagFail')
    );
  }

})
