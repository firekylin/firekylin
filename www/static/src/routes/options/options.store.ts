import GeneralStore from './general/general.store';

class OptionsStore {
    generalStore: GeneralStore;
    constructor() {
        this.generalStore = new GeneralStore();
    }
}

export default OptionsStore;
