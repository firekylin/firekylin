import GeneralStore from './general/general.store';
import ReadingStore from './reading/reading.store';

class OptionsStore {
    generalStore: GeneralStore;
    readingStore: ReadingStore;
    constructor() {
        this.generalStore = new GeneralStore();
        this.readingStore = new ReadingStore();
    }
}

export default OptionsStore;
