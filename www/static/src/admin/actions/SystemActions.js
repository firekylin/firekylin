import Reflux from 'reflux';


let AsyncConfig = {asyncResult: true};
let Actions = Reflux.createActions({
  load: AsyncConfig
});

export default Actions;