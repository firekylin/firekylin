import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import * as React from 'react';
import './dashboard.less';
import { observer, inject } from '@admin/utils/mobx-react';
import { DashBoardProps } from './dashboard.model';
import BreadCrumb from '../../components/breadcrumb';
import { NavLink } from '../../utils/router';
import dayjs from 'dayjs';
import { Modal } from 'antd';
const confirm = Modal.confirm;
import Chat from './chat';

const UPDATE_STEPS = () => ([
    [1, i18n.t("正在下载 Firekylin 最新版本..."), i18n.t("Firekylin 下载成功！")],
    [2, i18n.t("正在解压更新文件..."), i18n.t("文件更新成功！")],
    [3, i18n.t("正在重新安装依赖..."), i18n.t("依赖安装成功！")],
    [4, i18n.t("正在重启程序..."), i18n.t("程序重启成功，将在 %d 秒后刷新页面！")],
]);

const COUNT_DOWN = 3;
export function DashBoard(props: DashBoardProps) {
    useTranslation('admin');
    const [chatting, setChatting] = React.useState(false);
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
                            <h4 className="modal-title">{i18n.t("在线更新")}</h4>
                        </div>
                        <div className="modal-body">
                            <div className="dialog-panel anim-modal ">
                                <a href="###" className="close-btn" />
                                <div className="dialog-content">
                                    <ul className="update-step">
                                        {UPDATE_STEPS().map((step) => (
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
            title: i18n.t("更新 Firekylin"),
            content: i18n.t("使用扩展设置中的安装方式：本地更新依赖并重启服务；连接 GitHub 时创建升级 PR。更新前请备份数据。"),
            onOk: () => new Promise<void>((resolve, reject) => {
                props.sharedStore.updateSystem(1).subscribe({
                    next: (res: any) => {
                        if (res.errno !== 0) { reject(new Error(i18n.t(res.errmsg || '') || i18n.t("更新失败"))); return; }
                        const result = res.data;
                        if (result.url) {
                            Modal.success({ title: i18n.t("升级 PR 已创建"), content: <a href={result.url} target="_blank" rel="noreferrer">{i18n.t("查看 PR")}</a> });
                        } else if (result.restartRequired) {
                            Modal.info({ title: i18n.t("依赖已更新，请手动重启服务") });
                        } else {
                            Modal.success({ title: i18n.t("依赖已更新，服务正在重启"), onOk: () => location.reload() });
                        }
                        resolve();
                    },
                    error: (error: any) => { Modal.error({ title: i18n.t("更新失败"), content: String(i18n.t(error.message || '') || error) }); reject(error); },
                });
            }),
        });
    };
    legacy.render = function render() {
        const links = [
            { url: '/post/create', title: i18n.t("撰写新文章"), type: 2 },
            { url: '/page/create', title: i18n.t("创建页面"), type: 1 },
            { url: '/appearance/theme', title: i18n.t("更改外观"), type: 1 },
            { url: '/options/general', title: i18n.t("系统设置"), type: 1 },
        ].filter((link) => link.type >= window.SysConfig.userInfo.type);

        const { versions, count } = props.dashBoardStore.systemInfo;
        const { posts } = props.dashBoardStore;
        const overviewDetails = (<>
                    <hr />
                    <div className="row">
                        <div className="col-md-5">
                            <h4>{i18n.t("最近发布的文章")}</h4>
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
                            <h4>{i18n.t("系统概况")}</h4>
                            <ul>
                                <li>
                                    <label>{i18n.t("服务器系统：")}</label>
                                    {versions.platform}
                                </li>
                                <li>
                                    <label>{i18n.t("Node.js版本：")}</label>
                                    {versions.nodeVersion}
                                </li>
                                <li>
                                    <label>{i18n.t("V8引擎版本：")}</label>
                                    {versions.v8Version}
                                </li>
                                <li>
                                    <label>{i18n.t("数据库版本：")}</label>
                                    {versions.mysqlVersion}
                                </li>
                                <li>
                                    <label>{i18n.t("ThinkJS版本：")}</label>
                                    {versions.thinkjsVersion}
                                </li>
                                <li>
                                    <label>{i18n.t("FireKylin版本：")}</label>
                                    {versions.firekylinVersion}
                                </li>
                            </ul>
                        </div>
                        <div className="col-md-4">
                            <h4>{i18n.t("关于我们")}</h4>
                            <ul>
                                <li>
                                    <label>{i18n.t("项目主页：")}</label>
                                    <a
                                        href="https://firekylin.lithub.cc/"
                                        target="_blank"
                                    >
                                        http://firekylin.lithub.cc/
                                    </a>
                                </li>
                                <li>
                                    <label>{i18n.t("项目源码：")}</label>
                                    <a href="https://github.com/firekylin/firekylin">
                                        https://github.com/firekylin/firekylin
                                    </a>
                                </li>
                                <li>
                                    <label>{i18n.t("帮助文档：")}</label>
                                    <a
                                        href="https://github.com/firekylin/firekylin/wiki"
                                        target="_blank"
                                    >
                                        https://github.com/firekylin/firekylin/wiki
                                    </a>
                                </li>
                                <li>
                                    <label>{i18n.t("问题反馈：")}</label>
                                    <a href="https://github.com/firekylin/firekylin/issues">
                                        https://github.com/firekylin/firekylin/issues
                                    </a>
                                </li>
                                <li>
                                    <label>{i18n.t("开发成员：")}</label>
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
        </>);

        return (
            <div className="fk-content-wrap">
                <BreadCrumb className="breadcrumb" {...props} />
                <div className={`manage-container${Number(window.SysConfig.userInfo.type) === 1 ? ' overview-chat-container' : ''}${chatting ? ' overview-conversation' : ''}`}>
                    {versions.needUpdate && !chatting ? (
                        <p className="bg-info update-message">
                            Firekylin{' '}
                            <a
                                href={`https://github.com/firekylin/firekylin/releases/tag/${versions.needUpdate}`}
                            >
                                {versions.needUpdate}
                            </a>{' '}
                            {i18n.t("已经发布，请更新依赖版本，如果是源码安装可")}{' '}
                            <a href="http://firekylin.lithub.cc/release/v1/latest.tar.gz">
                                {i18n.t("下载更新")}
                            </a>{' '}
                            {i18n.t("或者使用")}{' '}
                            <a
                                href="javascript:void(0)"
                                onClick={() => legacy.renderUpdateConfirm()}
                            >
                                {i18n.t("在线更新")}
                            </a>
                            ！
                        </p>
                    ) : null}
                    {Number(window.SysConfig.userInfo.type) === 1 ? (
                            <Chat onConversationChange={setChatting}>{overviewDetails}</Chat>
                    ) : (
                        <>
                            <h3 style={{ marginBottom: '30px' }}>{i18n.t("网站概要")}</h3>
                            <p>
                                {i18n.t('目前有 {{posts}} 篇文章，{{comments}} 条评论，分布在 {{categories}} 个分类中。', {
                                    posts: count.posts,
                                    comments: count.comments,
                                    categories: count.cates,
                                })}
                            </p>
                            <p>{i18n.t("点击下面的链接快速开始:")}</p>
                            <div className="quick-link">
                                {links.map((link) => (
                                    <NavLink key={link.url} to={link.url}>
                                        {link.title}
                                    </NavLink>
                                ))}
                            </div>
                            {overviewDetails}
                        </>
                    )}
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
