import GeneralStore from './general/general.store';
import ReadingStore from './reading/reading.store';
import TwoFactorAuthStore from './two-factor-auth/two-factor-auth.store';

class OptionsStore {
    generalStore: GeneralStore;
    readingStore: ReadingStore;
    twoFactorAuthStore: TwoFactorAuthStore;
    constructor() {
        this.generalStore = new GeneralStore();
        this.readingStore = new ReadingStore();
        this.twoFactorAuthStore = new TwoFactorAuthStore();
    }
}

export default OptionsStore;
