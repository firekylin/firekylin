import ThemeStore from './theme/theme.store';

class AppearanceStore {
    themeStore: ThemeStore;
    constructor() {
        this.themeStore = new ThemeStore(this);
    }
}

export default AppearanceStore;
