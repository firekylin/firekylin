import { observable, action } from 'mobx';
import superagent from 'superagent';
import { AppStore } from '../../app.store';
import firekylin from '../../utils/firekylin';
import { http } from '../../utils/http';
import { UserEditPwdState } from './user.model';
import {message} from "antd";
// import {Object} from "aws-sdk/clients/s3";

// import UserAction from '../action/user';

export default class UserStore{
    appStore;

    constructor(appStore: AppStore) {
        this.appStore = appStore;
    }

    @observable userList:any = [];
    @observable loading = true;
    @observable key = 0;

    @observable submitting: false;
    @observable userInfo: {};
    @observable hasEmail: false;

    @observable userEditPwdState:UserEditPwdState = {
        submitting: false,
        userInfo: {}
    };

    @action
    setUserList = data => this.userList = data;

    @action
    setLoading = data => this.loading = data;

    @action
    setKey= data => this.key = data;

    @action
    setSubmitting = data => this.submitting = data;

    @action
    setUserInfo = data => this.userInfo = data;

    @action
    setHasEmail = data => this.hasEmail = data;

    @action
    setUserEditPwdState = (data:UserEditPwdState) => {
        this.userEditPwdState = Object.assign({},this.userEditPwdState,data);
    }

    // 获取用户列表
    @action
    getUserList(type ?: string) {
        http.get<any>(`/admin/api/user`,{type})
            .toPromise()
            .then(data => {
                this.setUserList(data.data);
                this.setLoading(false);
            })
            .catch(err => {
                message.error('加载用户列表失败，请稍后重试');
            })
    }

    // 通过
    @action
    passUser(userId : number) {
        http.post<any>(`/admin/api/user/${userId}?method=put&type=contributor`,)
            .toPromise()
            .then(data => {
                this.setUserList(data.data);
                this.setLoading(false);
            })
            .catch(err => {
                message.error('加载用户列表失败，请稍后重试');
            })
    }

    // 删除用户
    @action
    deleteUser(userId : number) {
        http.post<any>(`/admin/api/user/${userId}?method=delete`,)
            .toPromise()
            .then(data => {
                message.success('删除成功');
                this.getUserList(this.key===3?'contributor':'')
            })
            .catch(err => {
                message.error('删除失败，请稍后重试');
            })
    }

    // 保存用户
    @action
    saveUser(data,resolve,reject) {
        let id = data.id;
        delete data.id;
        let url = '/admin/api/user';
        if(id) {
            url += '/' + id + '?method=put';
        }
        let req = superagent.post(url);
        req.type('form').send(data);
        return firekylin.request(req).then(data => {
            resolve();
            // this.trigger(data, 'saveUserSuccess');
        }).catch(err => {
            reject();
            // this.trigger(err, 'saveUserFail');
        })
    }

    // 生成钥匙
    @action
    generateKey(userId,resolve,reject) {
        let url = '/admin/api/user/' + userId + '?type=key';
        let req = superagent.post(url);
        req.type('form').send();
        return firekylin.request(req).then(
            data => {
                // this.trigger(data, 'getUserInfo')
                resolve();
            },
            err => {
                // this.trigger(err, 'getUserInfoFailed')
                reject();
            }
        );
    }

    savePwd(data) {
        // let url = '/admin/user/password';
        // let req = superagent.post(url);
        // req.type('form').send(data);
        // return firekylin.request(req).then(data => {
        //     this.trigger(data, 'saveUserSuccess');
        // }).catch(err => {
        //     this.trigger(err, 'saveUserFail');
        // })
        http.post<any>(`/admin/user/password`,data)
            .toPromise()
            .then(data => {
                message.success('更新成功');
                this.setUserEditPwdState({submitting: false});
            })
            .catch(err => {
                this.setUserEditPwdState({submitting: false});
                message.error('更新失败，请稍后重试');
            });
    }
    // /**
    //  * login
    //  * @param  {[type]} data [description]
    //  * @return {[type]}      [description]
    //  */
    // onLogin(data) {
    //     let req = superagent.post('/admin/user/login');
    //     req.type('form').send(data);
    //     return firekylin.request(req).then(data => {
    //         this.trigger(data, 'LoginSuccess');
    //     }).catch(err => {
    //         this.trigger(err, 'LoginFail');
    //     })
    // },
    //
    // onForgot(data) {
    //     let req = superagent.post('/admin/user/forgot');
    //     req.type('form').send(data);
    //     return firekylin.request(req).then(
    //         data => this.trigger(data, 'forgotSuccess')
    //     ).catch(
    //         err => this.trigger(err, 'forgotFail')
    //     );
    // },
    //
    // onReset(data) {
    //     let req = superagent.post('/admin/user/reset');
    //     req.type('form').send(data);
    //     return firekylin.request(req).then(
    //         data => this.trigger(data, 'resetSuccess')
    //     ).catch(
    //         err => this.trigger(err, 'resetFail')
    //     );
    // },
    //

}
