import Reflux from 'reflux';


let AsyncConfig = {asyncResult: true};
let Actions = Reflux.createActions({
  load: AsyncConfig,
  update: AsyncConfig
});

export default Actions;