import Reflux from 'reflux';

export default Reflux.createActions({
  confirm: {children: ['completed', 'failed']},
  panel: {children: ['completed', 'failed']},
  alert: {children: ['completed', 'failed']},
  remove: {}
});
