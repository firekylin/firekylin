import Reflux from 'reflux';

export default Reflux.createActions({
  list: {children: ['completed', 'failed'], asyncResult: true},
  save: {children: ['completed', 'failed'], asyncResult: true},
  saveThemeConfig: {children: ['completed', 'failed'], asyncResult: true}
});
