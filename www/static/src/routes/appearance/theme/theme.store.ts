import { observable, action } from 'mobx';
import { message } from 'antd';
import { http } from '../../../utils/http';
import AppearanceStore from '../appearance.store';
import { Theme } from './theme.model';

class ThemeStore {
    appearanceStore: AppearanceStore;
    @observable themeList: Theme[] = []; 
    @observable data = {
        theme: window.SysConfig.options.theme || 'firekylin',
    };
    constructor(appearanceStore: AppearanceStore) {
        this.appearanceStore = appearanceStore;
    }

    @action setThemeList = themes => this.themeList = themes;
    @action setData = data => {
        this.data = Object.assign({}, this.data, data);
    }

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

    themeSelect(params: {theme: string}) {
        http.post('/admin/api/options?method=put', params)
        .subscribe(
            res => {
                message.success('设置成功');
            }
        );
    }

    themeConfigSave(params: any) {
        http.post('/admin/api/options?method=put', params)
        .subscribe(
            res => {
                message.success('设置成功');
            }
        );
    } 

}

export default ThemeStore;
