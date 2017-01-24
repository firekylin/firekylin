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
  onForkTheme(theme, new_theme) {
    let req = superagent.post('/admin/api/theme?method=put');
    req.type('form').send({theme, new_theme});
    return firekylin.request(req).then(
      data => this.trigger(data, 'forkThemeSuccess'),
      err => this.trigger(err, 'forkThemeFailed')
    );
  },
  onGetThemeFile(filePath) {
    let req = superagent.get('/admin/api/theme?type=file&filePath=' + filePath);
    return firekylin.request(req).then(
      data => this.trigger(data, 'getThemeFileSuccess'),
      err => this.trigger(err, 'getThemeFileFailed')
    );
  },
  onSaveThemeConfig(data) {
    let req = superagent.post('/admin/api/options?method=put');
    req.type('form').send({'themeConfig': JSON.stringify(data)});
    return firekylin.request(req).then(
      data => this.trigger(data, 'saveThemeConfigSuccess'),
      err => this.trigger(err, 'saveThemeConfigFailed')
    );
  },
  onGetThemeFileList(theme) {
    let req = superagent.get('/admin/api/theme?type=fileList&theme=' + theme);
    return firekylin.request(req).then(
      data => this.trigger(data, 'getThemeFileListSuccess'),
      err => this.trigger(err, 'getThemeFileListFailed')
    );
  },
  onUpdateThemeFile(filePath, content) {
    let req = superagent.post('/admin/api/theme?method=update');
    req.type('form').send({filePath, content});
    return firekylin.request(req).then(
      data => this.trigger(data, 'updateThemeFileSuccess'),
      err => this.trigger(err, 'updateThemeFileFailed')
    );
  },
  onGetPageTemplateList(theme) {
    let req = superagent.get('/admin/api/theme?type=templateList&theme=' + theme);
    return firekylin.request(req).then(
      data => this.trigger(data, 'getThemeTemplateListSuccess'),
      err => this.trigger(err, 'getThemeTemplateListFailed')
    );
  }
})
