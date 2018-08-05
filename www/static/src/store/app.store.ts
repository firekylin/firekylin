import { observable, action, configure } from 'mobx';
import IndexStore from '../routes/index/index.store';

configure({
    enforceActions: true
});

export class AppStore {

    readonly indexStore: IndexStore;
    @observable say = '';

    constructor() {
        this.indexStore = new IndexStore(this);
    }

    @action setSay = text => this.say = text;

}

export default new AppStore();