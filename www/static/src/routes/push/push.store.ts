import { AppStore } from '../../app.store';
import { message } from 'antd';
import { http } from '../../utils/http';
import { observable, action } from 'mobx';
import { PushCreateParams } from './push.model';
// import { Object } from 'aws-sdk/clients/s3';

export default class PushStore {
    appStore;

    constructor(appStore: AppStore) {
        this.appStore = appStore;
    }

    @observable pushList: any = [];
    @observable loading = false;
    @observable pushCreateParam: PushCreateParams = {
        submitting: false,
        pushInfo: {
            key: '',
            title: ''
        }
    };

    @action setPushList = (data) => this.pushList = data;
    @action setLoading = (data) => this.loading = data;
    @action setPushCreateParam = (data) => {
        Object.assign(this.pushCreateParam, data);
    };

    @action
    getPushList() {
        // let url = '/admin/api/options?type=push';
        // if(id) { url += `&key=${id}`; }
        // let req = superagent.get(url);
        // return firekylin.request(req).then(
        //     data => this.trigger(data, id ? 'getPushInfo' : 'getPushList')
        // );
        http.get('/admin/api/options?type=push')
            .toPromise()
            .then((data) => {
                this.setPushList(data);
                this.setLoading(false);
            });
    }

    @action
    getPushInfo(id) {
        http.get(`/admin/api/options?type=push&key=${id}`)
            .toPromise()
            .then((data) => {
                this.setPushCreateParam({
                    pushInfo: data
                });
            });
    }

    @action
    savePush(data: any) {
        // let url = '/admin/api/options?method=put&type=push';
        // let req = superagent.post(url);
        // req.type('form').send(data);
        // return firekylin.request(req).then(
        //     data => this.trigger(data, 'savePushSuccess'),
        //     err => this.trigger(err, 'savePushFailed')
        // );
        http.post(`/admin/api/options?method=put&type=push`, data)
            .toPromise()
            .then((res) => {
                message.success(data.id ? '保存成功' : '添加成功');
                this.setPushCreateParam({submitting: false});
                // setTimeout(() => this.redirect('push/list'), 1000);
            },(err) => {
                message.error(err);
                this.setPushCreateParam({submitting: false})
            });
    }

    @action
    deletePush(id) {
        http.get(`/admin/api/options?method=delete&type=push&key=${id}`)
            .toPromise()
            .then((data) => {
                message.success('删除成功');
                this.setLoading(true);
                this.getPushList();
                // this.setState({loading: true}, PushAction.select.bind(PushAction));
            },(err) => {
                message.error(err);
            });
    }
}