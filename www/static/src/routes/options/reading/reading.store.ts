import i18n from '@admin/i18n';
import { makeAutoObservable } from 'mobx';
import { http } from '../../../utils/http';
import { message } from 'antd';

class ReadingStore {
    loading = false;
    data = {
        options: window.SysConfig.options,
    };

    constructor() {
        makeAutoObservable(this);
    }

    setData = data => {
        this.data = Object.assign({}, this.data, data);
    }
    setLoading = loading => {
        this.loading = loading;
    }

    submit(params: any) {
        this.setLoading(true);
        http.post('/admin/api/options?method=put', params)
        .subscribe(
            res => {
                if (res.errno === 0) {
                    this.setLoading(false);
                    message.success(i18n.t("更新成功"));
                } else {
                    this.setLoading(false);
                }
            },
            err => {
                this.setLoading(false);
                message.error(typeof err === 'string' ? i18n.t(err) : err);
            }
        );

    }
}

export default ReadingStore;
