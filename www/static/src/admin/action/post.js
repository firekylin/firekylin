import Reflux from 'reflux';

let AsyncConfig = {asyncResult: true};
export default Reflux.createActions({
  select: {children: ['completed', 'failed']},
  selectList: {children: ['completed', 'failed']},
  selectLastest: {children: ['completed', 'failed']},
  delete: {children: ['completed', 'failed']},
  save: {children: ['completed', 'failed'], asyncResult: true}
});
