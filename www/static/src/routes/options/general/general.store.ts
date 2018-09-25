import { observable, action } from 'mobx';

class GeneralStore {
    @observable data = {
        options: window.SysConfig.options
    };

    @action setData = data => {
        this.data = Object.assign({}, this.data, data);
    }
}

export default GeneralStore;
