import ThemeStore from './theme/theme.store';
import NavigationStore from './navigation/navigation.store';

class AppearanceStore {
    themeStore: ThemeStore;
    navigationStore: NavigationStore;
    constructor() {
        this.themeStore = new ThemeStore(this);
        this.navigationStore = new NavigationStore(this);
    }
}

export default AppearanceStore;
