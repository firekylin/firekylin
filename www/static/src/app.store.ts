import { observable, action, configure } from 'mobx';
import DashBoardStore from './routes/dashboard/dashboard.store';

configure({
    enforceActions: true
});

export class AppStore {

    readonly dashBoardStore: DashBoardStore;
    @observable say = '';

    constructor() {
        this.dashBoardStore = new DashBoardStore(this);
    }

    @action setSay = text => this.say = text;

}

export default new AppStore();