import Reflux from 'reflux';

export default Reflux.createActions({
  select: {children: ['completed', 'failed']},
  delete: {children: ['completed', 'failed']},
  pass: {children: ['completed', 'failed']},
  save: {children: ['completed', 'failed'], asyncResult: true},
  savepwd: {children: ['completed', 'failed'], asyncResult: true},
  login: {children: ['completed', 'failed'], asyncResult: true},
  forgot: {children: ['completed', 'failed'], asyncResult: true},
  reset: {children: ['completed', 'failed'], asyncResult: true},
  generateKey: {children: ['completed', 'failed'], asyncResult: true}
});
