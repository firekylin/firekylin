import * as React from 'react';
import './dashboard.less';
import { observer, inject } from '@admin/utils/mobx-react';
import { DashBoardProps } from './dashboard.model';
import BreadCrumb from '../../components/breadcrumb';
import AIConnectionGuide from './ai-connection-guide';
import { NavLink } from '../../utils/router';
import dayjs from 'dayjs';
import { Modal } from 'antd';
import { Subscription } from 'rxjs';
const confirm = Modal.confirm;

const UPDATE_STEPS = [
    [1, '正在下载 Firekylin 最新版本...', 'Firekylin 下载成功！'],
    [2, '正在解压更新文件...', '文件更新成功！'],
    [3, '正在重新安装依赖...', '依赖安装成功！'],
    [4, '正在重启程序...', '程序重启成功，将在 %d 秒后刷新页面！'],
];

const COUNT_DOWN = 3;
function DashBoard(props: DashBoardProps) {
    const [state, setState] = React.useState(() => ({
        posts: [],
        step: 1,
        downCount: COUNT_DOWN,
        showUpdate: false,
    }));
    const legacyRef = React.useRef({});
    const legacy = legacyRef.current as any;
    legacy.state = state;
    legacy.setState = (update: any, callback?: () => void) => {
        setState((previous: any) => {
            const next = {
                ...previous,
                ...(typeof update === 'function' ? update(previous, props) : update),
            };
            legacy.state = next;
            return next;
        });
        if (callback) queueMicrotask(callback);
    };
    if (!legacy.__initialized) {
        legacy.__initialized = true;
    }
    legacy.beforeMount = function beforeMount() {
        props.dashBoardStore.getSelectLast();
        props.dashBoardStore.getSystemInfo();
    };
    legacy.handleClick = function handleClick() {
        props.dashBoardStore.setPosts('hello');
    };
    legacy.renderUpdate = function renderUpdate() {
        return (
            <div
                className="modal fade in"
                style={{ display: legacy.state.showUpdate ? 'block' : 'none' }}
            >
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <button
                                type="button"
                                onClick={() => {
                                    legacy.setState({ showUpdate: false });
                                    legacy.updateSubscription$.unsubscribe();
                                }}
                                className="close"
                                data-dismiss="modal"
                                aria-label="Close"
                            >
                                <span aria-hidden="true">×</span>
                            </button>
                            <h4 className="modal-title">在线更新</h4>
                        </div>
                        <div className="modal-body">
                            <div className="dialog-panel anim-modal ">
                                <a href="###" className="close-btn" />
                                <div className="dialog-content">
                                    <ul className="update-step">
                                        {UPDATE_STEPS.map((step) => (
                                            <li
                                                key={step[0]}
                                                className={
                                                    legacy.state.step >= step[0]
                                                        ? 'show'
                                                        : ''
                                                }
                                            >
                                                <i
                                                    className={
                                                        legacy.state.step > step[0]
                                                            ? 'success'
                                                            : ''
                                                    }
                                                >
                                                    {step[0]}
                                                </i>
                                                <div className="pipe">
                                                    <div className="half" />
                                                </div>
                                                <span className="loading">
                                                    {step[1]}
                                                </span>
                                                <span className="ok">
                                                    {(step[2] as string).replace(
                                                        '%d',
                                                        legacy.state.downCount.toString(),
                                                    )}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    legacy.renderUpdateConfirm = function renderUpdateConfirm() {
        confirm({
            title: '在线更新警告!',
            content:
                '在线更新会覆盖文件，请确认你已经备份好对程序的修改，如果没有修改请忽略该警告。',
            onOk: () => {
                legacy.setState({ showUpdate: true });
                legacy.updateSystem();
            },
        });
    };
    legacy.updateSystem = function updateSystem() {
        legacy.updateSubscription$ = props.sharedStore
            .updateSystem(legacy.state.step)
            .subscribe((res) => {
                if (legacy.state.step <= UPDATE_STEPS.length) {
                    legacy.setState({ step: legacy.state.step + 1 }, () =>
                        legacy.updateSystem(),
                    );
                }
                if (legacy.state.step > UPDATE_STEPS.length) {
                    setTimeout(location.reload.bind(location), COUNT_DOWN * 1000);
                    setInterval(
                        () =>
                            legacy.setState({
                                downCount: Math.max(0, --legacy.state.downCount),
                            }),
                        1000,
                    );
                }
            });
    };
    legacy.render = function render() {
        const links = [
            { url: '/post/create', title: '撰写新文章', type: 2 },
            { url: '/page/create', title: '创建页面', type: 1 },
            { url: '/appearance/theme', title: '更改外观', type: 1 },
            { url: '/options/general', title: '系统设置', type: 1 },
        ].filter((link) => link.type >= window.SysConfig.userInfo.type);

        const { versions, count } = props.dashBoardStore.systemInfo;
        const { posts } = props.dashBoardStore;

        return (
            <div className="fk-content-wrap">
                <BreadCrumb className="breadcrumb" {...props} />
                <div className="manage-container">
                    {versions.needUpdate ? (
                        <p className="bg-info update-message">
                            Firekylin{' '}
                            <a
                                href={`https://github.com/firekylin/firekylin/releases/tag/${versions.needUpdate}`}
                            >
                                {versions.needUpdate}
                            </a>{' '}
                            已经发布，请更新依赖版本，如果是源码安装可{' '}
                            <a href="http://firekylin.lithub.cc/release/v1/latest.tar.gz">
                                下载更新
                            </a>{' '}
                            或者使用{' '}
                            <a
                                href="javascript:void(0)"
                                onClick={() => legacy.renderUpdateConfirm()}
                            >
                                在线更新
                            </a>
                            ！
                        </p>
                    ) : null}
                    <h3 style={{ marginBottom: '30px' }}>网站概要</h3>
                    <p>
                        目前有 {count.posts} 篇文章, 并有 {count.comments}{' '}
                        条关于你的评论在 {count.cates} 个分类中.{' '}
                    </p>
                    <p>点击下面的链接快速开始:</p>
                    <div className="quick-link">
                        {links.map((link) => (
                            <NavLink key={link.url} to={link.url}>
                                {link.title}
                            </NavLink>
                        ))}
                    </div>
                    <AIConnectionGuide
                        siteUrl={props.dashBoardStore.systemInfo.config.site_url}
                        enabled={props.dashBoardStore.systemInfo.mcpEnabled}
                    />
                    <hr />
                    <div className="row">
                        <div className="col-md-5">
                            <h4>最近发布的文章</h4>
                            <ul>
                                {(posts as any[]).map((post) => (
                                    <li key={post.id}>
                                        <label>
                                            {dayjs(post.create_time).format('MM.DD')}：
                                        </label>
                                        <a
                                            href={`/post/${post.pathname}`}
                                            target="_blank"
                                        >
                                            {post.title}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="col-md-3">
                            <h4>系统概况</h4>
                            <ul>
                                <li>
                                    <label>服务器系统：</label>
                                    {versions.platform}
                                </li>
                                <li>
                                    <label>Node.js版本：</label>
                                    {versions.nodeVersion}
                                </li>
                                <li>
                                    <label>V8引擎版本：</label>
                                    {versions.v8Version}
                                </li>
                                <li>
                                    <label>数据库版本：</label>
                                    {versions.mysqlVersion}
                                </li>
                                <li>
                                    <label>ThinkJS版本：</label>
                                    {versions.thinkjsVersion}
                                </li>
                                <li>
                                    <label>FireKylin版本：</label>
                                    {versions.firekylinVersion}
                                </li>
                            </ul>
                        </div>
                        <div className="col-md-4">
                            <h4>关于我们</h4>
                            <ul>
                                <li>
                                    <label>项目主页：</label>
                                    <a
                                        href="https://firekylin.lithub.cc/"
                                        target="_blank"
                                    >
                                        http://firekylin.lithub.cc/
                                    </a>
                                </li>
                                <li>
                                    <label>项目源码：</label>
                                    <a href="https://github.com/firekylin/firekylin">
                                        https://github.com/firekylin/firekylin
                                    </a>
                                </li>
                                <li>
                                    <label>帮助文档：</label>
                                    <a
                                        href="https://github.com/firekylin/firekylin/wiki"
                                        target="_blank"
                                    >
                                        https://github.com/firekylin/firekylin/wiki
                                    </a>
                                </li>
                                <li>
                                    <label>问题反馈：</label>
                                    <a href="https://github.com/firekylin/firekylin/issues">
                                        https://github.com/firekylin/firekylin/issues
                                    </a>
                                </li>
                                <li>
                                    <label>开发成员：</label>
                                    <a href="https://github.com/welefen">welefen</a>、
                                    <a href="https://github.com/lizheming">lizheming</a>
                                    、
                                    <a href="https://github.com/jeffreys-cat">Jeffrey</a>
                                    、<a href="https://github.com/wei">wei</a>、
                                    <a href="https://github.com/zheng-fan">Maple</a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
                {legacy.renderUpdate()}
            </div>
        );
    };
    React.useEffect(() => {
        legacy.beforeMount();
    }, []);
    return legacy.render();
}

export default inject('dashBoardStore', 'sharedStore')(observer(DashBoard));
