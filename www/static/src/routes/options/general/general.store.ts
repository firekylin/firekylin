import { observable, action } from 'mobx';
import { http } from '../../../utils/http';
import { message } from 'antd';

class GeneralStore {
    @observable loading = {
        logo: false,
        favicon: false,
        submit: false
    };
    @observable data = {
        options: window.SysConfig.options
    };

    @action setData = data => {
        this.data = Object.assign({}, this.data, data);
    }
    @action setLoading = loading => {
        this.loading = Object.assign({}, this.loading, loading);
    }

    submit(params: any) {
        this.setLoading({submit: true});
        http.post('/admin/api/options?method=put', params)
        .subscribe(
            res => {
                if (res.errno === 0) {
                    this.setLoading({submit: false});
                    message.success('更新成功');
                } else {
                    this.setLoading({submit: false});
                }
            },
            err => {
                this.setLoading({submit: false});
                message.error(err);
            }
        );

    }
}

export default GeneralStore;
