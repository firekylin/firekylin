import Reflux from 'reflux';

export default Reflux.createActions({
  list: {children: ['completed', 'failed'], asyncResult: true},
  save: {children: ['completed', 'failed'], asyncResult: true},
  forkTheme: {children: ['completed', 'failed'], asyncResult: true},
  getThemeFile: {children: ['completed', 'failed'], asyncResult: true},
  saveThemeConfig: {children: ['completed', 'failed'], asyncResult: true},
  getThemeFileList: {children:['completed', 'failed'], asyncResult: true},
  updateThemeFile: {children: ['completed', 'failed'], asyncResult: true},
  getPageTemplateList: {children: ['completed', 'failed'], asyncResult: true}
});
