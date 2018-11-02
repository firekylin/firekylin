import { observable, action } from 'mobx';
import { http } from '../../../utils/http';

class LDAPStore {
    @observable data = {
        options: window.SysConfig.options,
        step: window.SysConfig.options.ldap_on === '1' ? 0 : 1,
    };

    @action setData = data => {
        this.data = Object.assign({}, this.data, data);
    }

    ldapSave(params: any) {
        return http.post('/admin/api/options?method=put', params);
    }

    ldapClose(params: any) {
        return http.post('/admin/api/options?method=put', params);
    }
}

export default LDAPStore;
