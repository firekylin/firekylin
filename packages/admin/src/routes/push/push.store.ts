import { AppStore } from '../../app.store';
import { message } from 'antd';
import { http } from '../../utils/http';
import { makeAutoObservable } from 'mobx';
import { PushCreateParams } from './push.model';

export default class PushStore {
    appStore;

    pushList: any = [];
    loading = false;
    pushCreateParam: PushCreateParams = {
        submitting: false,
        pushInfo: {
            appKey : '',
            appSecret : '',
            title : '',
            url : '',
        }
    };

    constructor(appStore: AppStore) {
        this.appStore = appStore;
        makeAutoObservable(this);
    }

    setPushList = (data) => this.pushList = data;
    setLoading = (data) => this.loading = data;
    setPushCreateParam = (data) => {
        Object.assign(this.pushCreateParam, data);
    }

    getPushList() {
        http.get('/admin/api/options?type=push')
            .toPromise()
            .then((data) => {
                this.setPushList(data.data);
                this.setLoading(false);
            });
    }

    getPushInfo(id: string) {
        http.get(`/admin/api/options?type=push&key=${id}`)
            .toPromise()
            .then((data) => {
                this.setPushCreateParam({
                    pushInfo: data.data
                });
            });
    }

    savePush(data: any) {
        return http.post(`/admin/api/options?method=put&type=push`, data)
            .toPromise()
            .then(
                () => {
                    message.success(data.id ? '保存成功' : '添加成功');
                    this.setPushCreateParam({ submitting: false });
                },
                () => {
                    this.setPushCreateParam({ submitting: false });
                }
            );
    }

    deletePush(id: string) {
        http.post(`/admin/api/options?method=delete&type=push&key=${id}`)
            .toPromise()
            .then(() => {
                message.success('删除成功');
                this.setLoading(true);
                this.getPushList();
            },    (err) => {
                message.error(err);
            });
    }
}