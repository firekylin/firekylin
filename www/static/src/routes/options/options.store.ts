import GeneralStore from './general/general.store';
import ReadingStore from './reading/reading.store';
import TwoFactorAuthStore from './two-factor-auth/two-factor-auth.store';
import LDAPStore from './ldap/ldap.store';

class OptionsStore {
    generalStore: GeneralStore;
    readingStore: ReadingStore;
    twoFactorAuthStore: TwoFactorAuthStore;
    ldapStore: LDAPStore;
    constructor() {
        this.generalStore = new GeneralStore();
        this.readingStore = new ReadingStore();
        this.twoFactorAuthStore = new TwoFactorAuthStore();
        this.ldapStore = new LDAPStore();
    }
}

export default OptionsStore;
