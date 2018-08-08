import { observable, action, configure } from 'mobx';
import DashBoardStore from './routes/dashboard/dashboard.store';
import LoginStore from './routes/login/login.store';

configure({
    enforceActions: true
});

export class AppStore {

    dashBoardStore: DashBoardStore;
    loginStore: LoginStore;
    @observable say = '';

    constructor() {
        this.dashBoardStore = new DashBoardStore(this);
        this.loginStore = new LoginStore(this);
    }

    @action setSay = text => this.say = text;

}

export default new AppStore();