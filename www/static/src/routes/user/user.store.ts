import { makeAutoObservable } from 'mobx';
import superagent from 'superagent';
import { AppStore } from '../../app.store';
import firekylin from '../../utils/firekylin';
import { http } from '../../utils/http';
import { UserEditPwdState } from './user.model';
import { message } from 'antd';

export default class UserStore {
    appStore;

    userList: any = [];
    loading = true;
    key = '0';

    submitting: false;
    userInfo: any = {
        id: 0,
        name: '',
        email: '',
        display_name: '',
        type: 0,
        status: 0,
        app_key: '',
        app_secret: '',
    };
    hasEmail: false;

    userEditPwdState: UserEditPwdState = {
        submitting: false,
        userInfo: {}
    };

    getUserList$ = (type?: string) => http.get<any>(`/admin/api/user`, {type});

    constructor(appStore: AppStore) {
        this.appStore = appStore;
        makeAutoObservable(this);
    }

    setUserList = data => this.userList = data

    setLoading = data => this.loading = data

    setKey = data => this.key = data

    setSubmitting = data => this.submitting = data

    setUserInfo = data => this.userInfo = data

    setHasEmail = data => this.hasEmail = data

    setUserEditPwdState = (data: UserEditPwdState) => {
        this.userEditPwdState = Object.assign(this.userEditPwdState, data);
    }

    // 获取用户列表
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
