import { observable, action } from 'mobx';
import { http } from '../../../utils/http';
import { message } from 'antd';
import { TFAQRCodeRes, TFAQRCodeReqAuth } from './two-factor-auth.model';

class TwoFactorAuthStore {
    @observable loading = {
        step3: false,
        step4: false,
    };
    @observable data = {
        otpauth_url: '',
        secret: '',
    };

    @action setData = data => {
        this.data = data;
    }
    @action setLoading = loading => {
        this.loading = Object.assign({}, this.loading, loading);
    }

    getQRCode() {
        http.get<TFAQRCodeRes>('/admin/api/options?type=2fa')
        .subscribe(
            res => {
                if (res.errno === 0) {
                    this.setData(res.data);
                }
            },
            err => {
                message.error(err);
            }
        );
    }

    authQRCode(data: TFAQRCodeReqAuth) {
        return http.post('/admin/api/options?type=2faAuth', data);
    }

    open2FA() {
        return http.post('/admin/api/options?method=put', {
            two_factor_auth: window.SysConfig.options.two_factor_auth ? window.SysConfig.options.two_factor_auth : this.data.secret
        });
    }

    close2FA() {
        return http.post('/admin/api/options?method=put', {
            two_factor_auth: ''
        });
    }
}

export default TwoFactorAuthStore;
