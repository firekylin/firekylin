import i18n, {refreshLocale} from '../../../i18n';
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
            async res => {
                if (res.errno === 0) {
                    this.setLoading({submit: false});
                    message.success(i18n.t('更新成功'));
                    if (params.locale) {
                        try {
                            await refreshLocale();
                        } catch {
                            message.warning(i18n.t('设置已保存，语言同步失败，请刷新页面重试'));
                        }
                    }
                } else {
                    this.setLoading({submit: false});
                }
            },
            err => {
                this.setLoading({submit: false});
                message.error(typeof err === 'string' ? i18n.t(err) : err);
            }
        );

    }
}

export default GeneralStore;
