import { observable, action } from 'mobx';
import superagent from 'superagent';
import { AppStore } from '../../app.store';
import firekylin from '../../utils/firekylin';

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

    /**
     * select user data
     * @param  {[type]} id [description]
     * @param  {[type]} filter [description]
     * @return {[type]}    [description]
     */
    @action
    select(id ?: number, filter ?: string) {
        let url = '/admin/api/user';
        if(id) {
            url += '/' + id;
        }
        if(filter) {
            url += '?type='+filter;
        }
        let req = superagent.get(url);
        return firekylin.request(req).then(data => {
            // todo
            // this.trigger(data, id ? 'getUserInfo' : 'getUserList');
            if (id){
                this.setUserList(data);
            } else {
                this.setUserInfo(data);
                this.setHasEmail(!!data.email);
            }
            this.setLoading(false);
            // this.loading = false;
        }).catch(() => {

        })
    }
    @action
    pass(userId,resolve,reject) {
        let url = '/admin/api/user/' + userId + '?method=put&type=contributor';
        let req = superagent.post(url);
        req.type('form').send();
        return firekylin.request(req).then(
            // data => this.trigger(data, 'passUserSuccess'),
            // err => this.trigger(err, 'passUserFailed')
            //todo
            data => {
                resolve(data);

            }).catch(err => {
                reject(err);
        });
    }

    @action
    deleteUser(userId,resolve,reject) {
        let url = '/admin/api/user/' + userId + '?method=delete';
        let req = superagent.post(url);
        req.type('form').send();
        return firekylin.request(req).then(data => {
            resolve();
            // this.trigger(data, 'deleteUserSuccess');
        }).catch(err => {
            reject();
            // this.trigger(err, 'deleteUserFail');
        })
    }


    /**
     * save user
     * @param  {Object} data []
     * @return {Promise}      []
     */
    @action
    save(data,resolve,reject) {
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

    // onSavepwd(data) {
    //     let url = '/admin/user/password';
    //     let req = superagent.post(url);
    //     req.type('form').send(data);
    //     return firekylin.request(req).then(data => {
    //         this.trigger(data, 'saveUserSuccess');
    //     }).catch(err => {
    //         this.trigger(err, 'saveUserFail');
    //     })
    // },
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
