import Reflux from 'reflux';

export default Reflux.createActions({
  select: {children: ['completed', 'failed']},
  selectList: {children: ['completed', 'failed']},
  selectLastest: {children: ['completed', 'failed']},
  delete: {children: ['completed', 'failed']},
  save: {children: ['completed', 'failed'], asyncResult: true},
  pass: {children: ['completed', 'failed'], asyncResult: true},
  deny: {children: ['completed', 'failed'], asyncResult: true},
  search: {children: ['completed', 'failed'], asyncResult: true}
});
