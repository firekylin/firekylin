import * as React from 'react';
import { lazy, Suspense } from 'react';
import { Route, Redirect, Switch, useRouteComponentProps } from '../utils/router';
import Loading from './loading';
import './container.less';
import Sidebar from '../components/sidebar';
import { http } from '../utils/http';
// Components
import DashBoard from './dashboard/dashboard';

const User = lazy(() => import('./user/user'));
const Post = lazy(() => import('./post/post'));
const Page = lazy(() => import('./page/page'));
const Category = lazy(() => import('./category/category'));
const Tag = lazy(() => import('./tag/tag'));
const Push = lazy(() => import('./push/push'));
const Appearance = lazy(() => import('./appearance/appearance'));
const Options = lazy(() => import('./options/options'));
const Comment = lazy(() => import('./comment/comment'));
const Media = lazy(() => import('./media/media'));

class Container extends React.Component<any, {}> {
    constructor(props: any) {
        super(props);
    }

    getOptions() {
        http.get('/admin/api/options').subscribe(res => {
            if (res.errno === 0) {
                window.SysConfig.options = res.data as any;
            }
        });
    }

    componentWillMount() {
        if (window.SysConfig.userInfo.type !== 4) this.getOptions();
    }
    render() {
        const isCommenter = window.SysConfig.userInfo.type === 4;
        return (
            <>
                    <Sidebar {...this.props} />
                    <div className="content">
                        <Suspense fallback={<Loading />}>
                            <Switch>
                                {isCommenter ? <Route path="/comment" component={Comment} /> : null}
                                {isCommenter ? <Route path={`/user`} component={User} /> : null}
                                {isCommenter ? <Redirect to="/comment" /> : null}
                                <Route exact={true} path="/dashboard" component={DashBoard}
                                />
                                <Route path="/post" component={Post} />
                                <Route path="/page" component={Page} />
                                <Route path="/cate" component={Category} />
                                <Route path="/tag" component={Tag} />
                                <Route path={`/user`} component={User} />
                                <Route path={`/push`} component={Push} />
                                <Route path="/appearance" component={Appearance} />
                                <Route path="/options" component={Options} />
                                <Route path="/comment" component={Comment} />
                                <Route path="/media" component={Media} />
                                <Redirect to="/dashboard" />
                            </Switch>
                        </Suspense>
                    </div>
            </>
        );
    }
}

export default function ContainerWithRouter() {
    return <Container {...useRouteComponentProps()} />;
}
