import { makeAutoObservable } from 'mobx';
import superagent from 'superagent';
import { AppStore } from '../../app.store';
import firekylin from '../../utils/firekylin';
import { http } from '../../utils/http';
import { getAuthorUsers } from '../../utils/users';
import { UserEditPwdState } from './user.model';
import { message } from 'antd';

export default class UserStore {
    appStore;

    userList: any = [];
    loading = true;
    key = '0';
    page = 1;
    pageSize = 20;
    total = 0;
    keyword = '';
    requestId = 0;

    submitting = false;
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

    userEditPwdState: UserEditPwdState = {
        submitting: false,
        userInfo: {}
    };

    getUserList$ = () => getAuthorUsers();

    constructor(appStore: AppStore) {
        this.appStore = appStore;
        makeAutoObservable(this);
    }

    setUserList = data => this.userList = data

    setLoading = data => this.loading = data

    setKey = data => this.key = data

    setSubmitting = data => this.submitting = data

    setUserInfo = data => this.userInfo = data

    setUserEditPwdState = (data: UserEditPwdState) => {
        this.userEditPwdState = Object.assign(this.userEditPwdState, data);
    }

    // 获取用户列表
    getUserList(
        type = this.key === '3' ? 'contributor' : '',
        page = this.page,
        keyword = this.keyword,
        pageSize = this.pageSize,
    ) {
        this.page = page;
        this.pageSize = pageSize;
        this.keyword = keyword;
        this.setLoading(true);
        const requestId = ++this.requestId;
        http.get<any>(`/admin/api/user`, {type, page, keyword, pageSize})
            .toPromise()
            .then(data => {
                if (requestId !== this.requestId) return;
                this.total = data.data.count;
                this.setUserList(data.data.data);
                this.setLoading(false);
                if (!this.userList.length && this.page > 1) {
                    this.getUserList(type, this.page - 1);
                }
            })
            .catch(err => {
                this.setLoading(false);
                message.error('加载用户列表失败，请稍后重试');
            });
    }

    // 获取用户信息
    getUserInfo(id: string) {
        http.get<any>(`/admin/api/user/${id}`)
            .toPromise()
            .then(data => {
                this.setUserInfo(data.data);
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
                this.getUserList();
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
                this.getUserList(this.key === '3' ? 'contributor' : '' );
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
            })
            .catch(err => {
                message.error(err);
            });
    }

    unlinkSocial(provider: string) {
        http.delete<any>(`/api/comment/social/${encodeURIComponent(provider)}`)
            .toPromise()
            .then(() => {
                message.success('解绑成功');
                this.getUserInfo(String(this.userInfo.id));
            })
            .catch(() => message.error('解绑失败，请稍后重试'));
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
