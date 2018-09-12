import { observable, action } from 'mobx';
import { message } from 'antd';
import { http } from '../../../utils/http';
import AppearanceStore from '../appearance.store';
import { Theme } from './theme.model';

class ThemeStore {
    appearanceStore: AppearanceStore;
    @observable themeList: Theme[] = []; 
    constructor(appearanceStore: AppearanceStore) {
        this.appearanceStore = appearanceStore;
    }

    @action setThemeList = themes => this.themeList = themes;

    getThemeList() {
        http.get<Theme[]>('/admin/api/theme')
        .subscribe(
            res => {
                if (res.errno === 0) {
                    this.setThemeList(res.data);
                }
            },
            err => {
                message.error(err);
            }
        );
    }

}

export default ThemeStore;
