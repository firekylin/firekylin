import { makeAutoObservable } from 'mobx';
import { message } from 'antd';
import { http } from '../../../utils/http';
import AppearanceStore from '../appearance.store';
import { Theme } from './theme.model';

class ThemeStore {
    appearanceStore: AppearanceStore;
    themeList: Theme[] = [];
    data = {
        theme: window.SysConfig.options.theme || 'firekylin',
    };
    constructor(appearanceStore: AppearanceStore) {
        this.appearanceStore = appearanceStore;
        makeAutoObservable(this);
    }

    setThemeList = themes => this.themeList = themes;
    setData = data => {
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

    getOptions() {
        return http.get('/admin/api/options');
    }

    themeSelect(params: {theme: string}) {
        http.post('/admin/api/options?method=put', params)
        .subscribe(
            res => {
                if (res.errno === 0) {
                    window.SysConfig.options.theme = params.theme;
                    this.setData({theme: params.theme});
                    message.success('设置成功');
                }
            }
        );
    }

    themeConfigSave(params: any) {
        http.post('/admin/api/options?method=put', params)
        .subscribe(
            res => {
                if (res.errno === 0) {
                    window.SysConfig.options.themeConfig = params.themeConfig;
                    message.success('设置成功');
                }
            }
        );
    } 

}

export default ThemeStore;
