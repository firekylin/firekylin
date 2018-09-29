import GeneralStore from './general/general.store';
import ReadingStore from './reading/reading.store';
import TwoFactorAuthStore from './two-factor-auth/two-factor-auth.store';
import LDAPStore from './ldap/ldap.store';
import CommentStore from './comment/comment.store';

class OptionsStore {
    generalStore: GeneralStore;
    readingStore: ReadingStore;
    twoFactorAuthStore: TwoFactorAuthStore;
    ldapStore: LDAPStore;
    commentStore: CommentStore;
    constructor() {
        this.generalStore = new GeneralStore();
        this.readingStore = new ReadingStore();
        this.twoFactorAuthStore = new TwoFactorAuthStore();
        this.ldapStore = new LDAPStore();
        this.commentStore = new CommentStore();
    }
}

export default OptionsStore;
