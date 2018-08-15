import { configure } from 'mobx';
import DashBoardStore from './routes/dashboard/dashboard.store';
import LoginStore from './routes/login/login.store';
import UserStore from './routes/user/user.store';
import PostStore from './routes/post/post.store';

configure({
    enforceActions: true
});

export class AppStore {

    dashBoardStore: DashBoardStore;
    loginStore: LoginStore;
    userStore: UserStore;
    postStore: PostStore;

    constructor() {
        this.dashBoardStore = new DashBoardStore(this);
        this.loginStore = new LoginStore(this);
        this.userStore = new UserStore(this);
        this.postStore = new PostStore(this);
    }

}

export default new AppStore();