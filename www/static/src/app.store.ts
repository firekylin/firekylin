import { configure } from 'mobx';
import DashBoardStore from './routes/dashboard/dashboard.store';
import LoginStore from './routes/login/login.store';
import UserStore from './routes/user/user.store';
import PostStore from './routes/post/post.store';
import SharedStore from './shared.store';
import CategoryStore from './routes/category/category.store';
import TagStore from './routes/tag/tag.store';
import PushStore from './routes/push/push.store';

configure({
    enforceActions: true
});

export class AppStore {

    dashBoardStore: DashBoardStore;
    loginStore: LoginStore;
    userStore: UserStore;
    postStore: PostStore;
    categoryStore: CategoryStore;
    tagStore: TagStore;
    sharedStore: SharedStore;
    pushStore: PushStore;

    constructor() {
        this.dashBoardStore = new DashBoardStore(this);
        this.loginStore = new LoginStore(this);
        this.userStore = new UserStore(this);
        this.postStore = new PostStore(this);
        this.categoryStore = new CategoryStore(this);
        this.tagStore = new TagStore(this);
        this.sharedStore = new SharedStore();
        this.pushStore = new PushStore(this);
    }

}

export default new AppStore();