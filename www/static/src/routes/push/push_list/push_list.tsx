import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import * as React from 'react';
import { Link } from '../../../utils/router';
import { Modal } from 'antd';
import { observer, inject } from '@admin/utils/mobx-react';
import { PushProps } from '../push.model';
import BreadCrumb from '../../../components/breadcrumb';
function PushList(props: PushProps) {
    useTranslation('admin');
    const [state, setState] = React.useState(() => ({}));
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

        legacy.pushStore = props.pushStore;
    }
    legacy.onMount = function onMount() {
        legacy.pushStore.getPushList();
    };
    legacy.handleDeletePush = function handleDeletePush(appKey: string) {
        Modal.confirm({
            title: i18n.t("提示"),
            content: i18n.t("确定删除嘛"),
            onOk: () => {
                // message.success('删除成功');
                legacy.pushStore.deletePush(appKey);
            },
        });
    };
    legacy.getPushList = function getPushList() {
        if (legacy.pushStore.loading) {
            return (
                <tr>
                    <td colSpan="8" className="center">
                        {i18n.t("加载中……")}
                    </td>
                </tr>
            );
        }
        if (!legacy.pushStore.pushList.length) {
            return (
                <tr>
                    <td colSpan="8" className="center">
                        {i18n.t("暂无记录")}
                    </td>
                </tr>
            );
        }
        return legacy.pushStore.pushList.map((item) => {
            return (
                <tr key={item.appKey}>
                    <td>
                        <a href={item.url} title={item.title} target="_blank">
                            {item.title}
                        </a>
                    </td>
                    <td>{item.url}</td>
                    <td>{item.appKey}</td>
                    <td>{item.appSecret}</td>
                    <td>
                        <Link to={`/push/edit/${item.appKey}`} title={item.title}>
                            <button type="button" className="btn btn-primary btn-xs">
                                <span className="glyphicon glyphicon-edit"></span>
                                {i18n.t("编辑")}
                            </button>
                        </Link>
                        <span> </span>
                        <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            onClick={legacy.handleDeletePush.bind(null, item.appKey)}
                        >
                            <span className="glyphicon glyphicon-trash"></span>
                            {i18n.t("删除")}
                        </button>
                    </td>
                </tr>
            );
        });
    };
    legacy.render = function render() {
        return (
            <div className="fk-content-wrap">
                <BreadCrumb {...props} />
                <div className="manage-container">
                    <table className="table table-striped">
                        <thead>
                            <tr>
                                <th>{i18n.t("网站名称")}</th>
                                <th>{i18n.t("网站地址")}</th>
                                <th>{i18n.t("推送公钥")}</th>
                                <th>{i18n.t("推送秘钥")}</th>
                                <th>{i18n.t("操作")}</th>
                            </tr>
                        </thead>
                        <tbody>{legacy.getPushList()}</tbody>
                    </table>
                </div>
            </div>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    return legacy.render();
}
export default inject('pushStore')(observer(PushList));
