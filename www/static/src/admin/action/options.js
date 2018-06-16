import Reflux from 'reflux';

export default Reflux.createActions({
  save: {children: ['completed', 'failed'], asyncResult: true},
  auth: {children: ['completed', 'failed'], asyncResult: true},
  qrcode: {children: ['completed', 'failed'], asyncResult: true},
  comment: {children: ['completed', 'failed'], asyncResult: true},
  upload: {children: ['completed', 'failed'], asyncResult: true},
  navigation: {children: ['completed', 'failed'], asyncResult: true},
  rssImportList: {children: ['completed', 'failed'], asyncResult: true},
  defaultCategory: {children: ['completed', 'failed'], asyncResult: true}
});
