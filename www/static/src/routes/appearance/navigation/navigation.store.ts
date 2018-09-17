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

    delete(params: any) {
        http.post('/admin/api/options?method=put', params)
        .subscribe(
            () => {
                message.success('删除成功');
            }
        );
    }

}

export default NavigationStore;
