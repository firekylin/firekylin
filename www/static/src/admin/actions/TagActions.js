import Reflux from 'reflux';


let AsyncConfig = {asyncResult: true};
let Actions = Reflux.createActions({
    add: AsyncConfig,
    load: AsyncConfig,
    update: AsyncConfig,
    delete: AsyncConfig
});

export default Actions;