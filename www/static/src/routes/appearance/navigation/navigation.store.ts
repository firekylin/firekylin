import { observable, action } from 'mobx';
import { message } from 'antd';
import { http } from '../../../utils/http';
import AppearanceStore from '../appearance.store';

class NavigationStore {

    appearanceStore: AppearanceStore;

    @observable data = {
    };
    constructor(appearanceStore: AppearanceStore) {
        this.appearanceStore = appearanceStore;
    }
    @action setData = data => {
        this.data = Object.assign({}, this.data, data);
    }

    update(navList: any) {
        return http.post('/admin/api/options?method=put', {
            navigation: JSON.stringify(navList)
        });
    }

}

export default NavigationStore;
