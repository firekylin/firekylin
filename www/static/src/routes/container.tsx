import * as React from 'react';
import { BrowserRouter as Router, Route, Redirect, Switch } from 'react-router-dom';
import Loadable from 'react-loadable';
import Loading from './loading';
import './container.less';
import Sidebar from '../components/sidebar';
// Components
import DashBoard from './dashboard/dashboard';
import { http } from '../utils/http';
const User = Loadable({
    loader: () => import(/* webpackChunkName: 'user' */'./user/user'),
    loading: Loading
});
const Post = Loadable({
    loader: () => import(/* webpackChunkName: 'post' */'./post/post'),
    loading: Loading
});
const Page = Loadable({
    loader: () => import(/* webpackChunkName: 'page' */'./page/page'),
    loading: Loading
});
const Category = Loadable({
    loader: () => import(/* webpackChunkName: 'category' */'./category/category'),
    loading: Loading
});
const Tag = Loadable({
    loader: () => import(/* webpackChunkName: 'tag' */'./tag/tag'),
    loading: Loading
});
const Push = Loadable({
    loader: () => import(/* webpackChunkName: 'push' */'./push/push'),
    loading: Loading
});
const Appearance = Loadable({
    loader: () => import(/* webpackChunkName: 'appearance' */'./appearance/appearance'),
    loading: Loading
});
const Options = Loadable({
    loader: () => import(/* webpackChunkName: 'options' */'./options/options'),
    loading: Loading
});

const routerOptions = {
    basename: '/admin',
    forceRefresh: false
};

class Container extends React.Component<any, {}> {
    constructor(props: any) {
        super(props);
    }

    getOptions() {
        http.get('/admin/api/options')
        .subscribe(
            res => {
                if (res.errno === 0) {
                    window.SysConfig.options = (res.data as any);
                }
            }
        );
    }
    
    componentWillMount() {
        this.getOptions();
    }
    render() {
        return (
            <Router {...routerOptions}>
                <>
                    <Sidebar {...this.props} />
                    <div className="content">
                        <Switch>
                            <Route exact={true} path="/dashboard" component={DashBoard}/>
                            <Route path="/post" component={Post}/>
                            <Route path="/page" component={Page}/>
                            <Route path="/cate" component={Category}/>
                            <Route path="/tag" component={Tag}/>
                            <Route path={`/user`} component={User}/>
                            <Route path={`/push`} component={Push}/>
                            <Route path="/appearance" component={Appearance}/>
                            <Route path="/options" component={Options}/>
                            <Redirect to="/dashboard" />
                        </Switch>
                    </div>
                </>
            </Router>
        );
    }
}

export default Container;
