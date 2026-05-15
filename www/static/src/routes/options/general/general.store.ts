import { makeAutoObservable } from 'mobx';
import { http } from '../../../utils/http';
import { message } from 'antd';

class GeneralStore {
    loading = {
        logo: false,
        favicon: false,
        submit: false
    };
    data = {
        options: window.SysConfig.options
    };

    constructor() {
        makeAutoObservable(this);
    }

    setData = data => {
        this.data = Object.assign({}, this.data, data);
    }
    setLoading = loading => {
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
