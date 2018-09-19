import ThemeStore from './theme/theme.store';
import NavigationStore from './navigation/navigation.store';
import EditStore from './edit/edit.store';

class AppearanceStore {
    themeStore: ThemeStore;
    navigationStore: NavigationStore;
    editStore: EditStore;
    constructor() {
        this.themeStore = new ThemeStore(this);
        this.navigationStore = new NavigationStore(this);
        this.editStore = new EditStore(this);
    }
}

export default AppearanceStore;
