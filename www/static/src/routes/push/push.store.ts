import { AppStore } from '../../app.store';
import { message } from 'antd';
import { http } from '../../utils/http';
import { observable, action } from 'mobx';
import { PushCreateParams } from './push.model';

export default class PushStore {
    appStore;

    @observable pushList: any = [];
    @observable loading = false;
    @observable pushCreateParam: PushCreateParams = {
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
    }

    @action setPushList = (data) => this.pushList = data;
    @action setLoading = (data) => this.loading = data;
    @action setPushCreateParam = (data) => {
        Object.assign(this.pushCreateParam, data);
    }

    @action
    getPushList() {
        http.get('/admin/api/options?type=push')
            .toPromise()
            .then((data) => {
                this.setPushList(data.data);
                this.setLoading(false);
            });
    }

    @action
    getPushInfo(id: string) {
        http.get(`/admin/api/options?type=push&key=${id}`)
            .toPromise()
            .then((data) => {
                this.setPushCreateParam({
                    pushInfo: data.data
                });
            });
    }

    @action
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

    @action
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