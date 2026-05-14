import { makeAutoObservable } from 'mobx';
import { message } from 'antd';
import { http } from '../../../utils/http';
import AppearanceStore from '../appearance.store';

class NavigationStore {

    appearanceStore: AppearanceStore;

    data = {
    };
    constructor(appearanceStore: AppearanceStore) {
        this.appearanceStore = appearanceStore;
        makeAutoObservable(this);
    }
    setData = data => {
        this.data = Object.assign({}, this.data, data);
    }

    update(navList: any) {
        return http.post('/admin/api/options?method=put', {
            navigation: JSON.stringify(navList)
        });
    }

}

export default NavigationStore;
