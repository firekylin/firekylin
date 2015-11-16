import Reflux from 'reflux';

let AsyncConfig = {asyncResult: true};

let Actions = Reflux.createActions({
  login: AsyncConfig,
  logout: AsyncConfig,
  check: AsyncConfig,
  showLogin: {},
  modifyPsw: AsyncConfig
});

export default Actions;