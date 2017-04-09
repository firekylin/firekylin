import Reflux from 'reflux';

export default Reflux.createActions({
  select: {children: ['completed', 'failed']},
  updateSystem: {childen: ['completed', 'failed']}
});
