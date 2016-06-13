import Reflux from 'reflux';
import superagent from 'superagent';
import firekylin from 'common/util/firekylin';
import ThemeAction from 'admin/action/theme';

export default Reflux.createStore({
  listenables: ThemeAction,
  onList() {
    let url = '/admin/api/theme';
    let req = superagent.get(url);
    return firekylin.request(req).then(
      data => this.trigger(data, 'getThemeSuccess'),
      err => this.trigger(err, 'getThemeFailed')
    );
  },
  onSave(data) {
    let req = superagent.post('/admin/api/options?method=put');
    req.type('form').send({'theme': data});
    return firekylin.request(req).then(
      data => this.trigger(data, 'saveThemeSuccess'),
      err => this.trigger(err, 'saveThemeFailed')
    );
  },
  onSaveThemeConfig(data) {
    let req = superagent.post('/admin/api/options?method=put');
    req.type('form').send({'themeConfig': JSON.stringify(data)});
    return firekylin.request(req).then(
      data => this.trigger(data, 'saveThemeConfigSuccess'),
      err => this.trigger(err, 'saveThemeConfigFailed')
    );
  }
})
