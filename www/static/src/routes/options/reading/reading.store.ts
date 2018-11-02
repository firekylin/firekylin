import { observable, action } from 'mobx';
import { http } from '../../../utils/http';
import { message } from 'antd';

class ReadingStore {
    @observable loading = false;
    @observable data = {
        options: window.SysConfig.options,
        frontPage: window.SysConfig.options.frontPagePage,
    };

    @action setData = data => {
        this.data = Object.assign({}, this.data, data);
    }
    @action setLoading = loading => {
        this.loading = loading;
    }

    submit(params: any) {
        this.setLoading(true);
        http.post('/admin/api/options?method=put', params)
        .subscribe(
            res => {
                if (res.errno === 0) {
                    this.setLoading(false);
                    message.success('更新成功');
                } else {
                    this.setLoading(false);
                }
            },
            err => {
                this.setLoading(false);
                message.error(err);
            }
        );

    }
}

export default ReadingStore;
