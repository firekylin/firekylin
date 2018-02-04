import Reflux from 'reflux';

export default Reflux.createActions({
  select: {children: ['completed', 'failed']},
  selectList: {children: ['completed', 'failed']},
  delete: {children: ['completed', 'failed']},
  save: {children: ['completed', 'failed'], asyncResult: true}
});
