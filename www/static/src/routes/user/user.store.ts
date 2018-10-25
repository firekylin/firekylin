import { observable, action } from 'mobx';
import superagent from 'superagent';
import { AppStore } from '../../app.store';
import firekylin from '../../utils/firekylin';
import { http } from '../../utils/http';
import { UserEditPwdState } from './user.model';
import { message } from 'antd';

export default class UserStore {
    appStore;

    @observable userList: any = [];
    @observable loading = true;
    @observable key = '0';

    @observable submitting: false;
    @observable userInfo;
    @observable hasEmail: false;

    @observable userEditPwdState: UserEditPwdState = {
        submitting: false,
        userInfo: {}
    };

    getUserList$ = (type?: string) => http.get<any>(`/admin/api/user`, {type});

    constructor(appStore: AppStore) {
        this.appStore = appStore;
    }

    @action
    setUserList = data => this.userList = data

    @action
    setLoading = data => this.loading = data

    @action
    setKey = data => this.key = data

    @action
    setSubmitting = data => this.submitting = data

    @action
    setUserInfo = data => this.userInfo = data

    @action
    setHasEmail = data => this.hasEmail = data

    @action
    setUserEditPwdState = (data: UserEditPwdState) => {
        this.userEditPwdState = Object.assign(this.userEditPwdState, data);
    }

    // 获取用户列表
    @action
    getUserList(type ?: string) {
        http.get<any>(`/admin/api/user`, {type})
            .toPromise()
            .then(data => {
                this.setUserList(data.data);
                this.setLoading(false);
            })
            .catch(err => {
                message.error('加载用户列表失败，请稍后重试');
            });
    }

    // 获取用户信息
    @action
    getUserInfo(id: string) {
        http.get<any>(`/admin/api/user/${id}`)
            .toPromise()
            .then(data => {
                this.setUserInfo(data.data);
                this.setHasEmail(!!data.data.email);
            })
            .catch(err => {
                message.error('加载用户信息失败，请稍后重试');
            });
    }

    // 通过
    @action
    passUser(userId: number) {
        http.post<any>(`/admin/api/user/${userId}?method=put&type=contributor`)
            .toPromise()
            .then(data => {
                this.setUserList(data.data);
                this.setLoading(false);
            })
            .catch(err => {
                message.error('加载用户列表失败，请稍后重试');
            });
    }

    // 删除用户
    @action
    deleteUser(userId: number) {
        http.post<any>(`/admin/api/user/${userId}?method=delete`)
            .toPromise()
            .then(data => {
                message.success('删除成功');
                this.getUserList(this.key === 3 ? 'contributor' : '' );
            })
            .catch(() => {
                message.error('删除失败，请稍后重试');
            });
    }

    // 保存用户
    @action
    saveUser(data: any, resolve: Function, reject: Function) {
        let id = data.id;
        delete data.id;
        let url = '/admin/api/user';
        if (id) {
            url += '/' + id + '?method=put';
        }
        let req = superagent.post(url);
        req.type('form').send(data);
        return firekylin.request(req).then(res => {
            resolve(res);
        }).catch(err => {
            reject(err);
        });
    }

    // 生成钥匙
    @action
    generateKey(userId: string) {
        http.post<any>(`/admin/api/user/${userId}?type=key`)
            .toPromise()
            .then(data => {
                this.setUserInfo(data.data);
                this.setHasEmail(!!data.data.email);
            })
            .catch(err => {
                message.error(err);
            });
    }

    savePwd(data: any) {
        http.post<any>(`/admin/user/password`, data)
            .toPromise()
            .then(() => {
                message.success('更新成功');
                this.setUserEditPwdState({submitting: false});
            })
            .catch(err => {
                this.setUserEditPwdState({submitting: false});
                message.error('更新失败，请稍后重试');
            });
    }
}
