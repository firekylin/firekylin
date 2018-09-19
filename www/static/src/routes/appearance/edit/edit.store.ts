import { observable, action } from 'mobx';
// import { message } from 'antd';
// import { http } from '../../../utils/http';
import AppearanceStore from '../appearance.store';

class EditStore {

    appearanceStore: AppearanceStore;

    @observable data = {
    };
    constructor(appearanceStore: AppearanceStore) {
        this.appearanceStore = appearanceStore;
    }
    @action setData = data => {
        this.data = Object.assign({}, this.data, data);
    }

}

export default EditStore;
