import { configure } from 'mobx';
import DashBoardStore from './routes/dashboard/dashboard.store';
import LoginStore from './routes/login/login.store';
import UserStore from './routes/user/user.store';
import PostStore from './routes/post/post.store';
import SharedStore from './shared.store';
import CategoryStore from './routes/category/category.store';
import PushStore from './routes/push/push.store';
import PageStore from './routes/page/page.store';
import ArticleStore from './components/article/article.store';
import AppearanceStore from './routes/appearance/appearance.store';
import OptionsStore from './routes/options/options.store';

configure({
    enforceActions: 'never'
});

export class AppStore {

    dashBoardStore: DashBoardStore;
    loginStore: LoginStore;
    userStore: UserStore;
    postStore: PostStore;
    categoryStore: CategoryStore;
    sharedStore: SharedStore;
    pushStore: PushStore;
    pageStore: PageStore;
    articleStore: ArticleStore;

    constructor() {
        this.sharedStore = new SharedStore();
        this.dashBoardStore = new DashBoardStore(this);
        this.loginStore = new LoginStore(this);
        this.userStore = new UserStore(this);
        this.postStore = new PostStore(this);
        this.categoryStore = new CategoryStore(this);
        this.pushStore = new PushStore(this);
        this.pageStore = new PageStore();
        this.articleStore = new ArticleStore();
    }

}

const store = {
    ...new AppStore(),
    ...new OptionsStore(),
    ...new AppearanceStore(),
};

export default store;