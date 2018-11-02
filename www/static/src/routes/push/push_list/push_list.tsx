
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Modal } from 'antd';
import { observer, inject } from 'mobx-react';
import { PushProps } from '../push.model';
import BreadCrumb from '../../../components/breadcrumb';

@inject('pushStore')
@observer
export default class PushList extends React.Component<PushProps, any> {

    pushStore: any;

    constructor(props: PushProps) {
        super(props);
        this.pushStore = this.props.pushStore
    }
    componentDidMount() {
        this.pushStore.getPushList();
    }

    handleDeletePush (appKey: string) {
        Modal.confirm({
            title: '提示',
            content: '确定删除嘛',
            onOk: () => {
                // message.success('删除成功');
                this.pushStore.deletePush(appKey);
            }
        });
    }

    getPushList() {
        if (this.pushStore.loading) {
            return (<tr><td colSpan="8" className="center">加载中……</td></tr>);
        }
        if (!this.pushStore.pushList.length) {
            return (<tr><td colSpan="8" className="center">暂无记录</td></tr>);
        }
        return this.pushStore.pushList.map(item => {
            return (
                <tr key={item.appKey}>
                    <td><a href={item.url} title={item.title} target="_blank">{item.title}</a></td>
                    <td>{item.url}</td>
                    <td>{item.appKey}</td>
                    <td>{item.appSecret}</td>
                    <td>
                        <Link to={`/push/edit/${item.appKey}`} title={item.title}>
                            <button type="button" className="btn btn-primary btn-xs">
                                <span className="glyphicon glyphicon-edit"></span>
                                编辑
                            </button>
                        </Link>
                        <span> </span>
                        <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            onClick={this.handleDeletePush.bind(this, item.appKey)}
                        >
                            <span className="glyphicon glyphicon-trash"></span>
                            删除
                        </button>
                    </td>
                </tr>
            );
        });
    }

    render() {
        return (
            <div className="fk-content-wrap">
                <BreadCrumb {...this.props} />
                <div className="manage-container">
                    <table className="table table-striped">
                        <thead>
                        <tr>
                            <th>网站名称</th>
                            <th>网站地址</th>
                            <th>推送公钥</th>
                            <th>推送秘钥</th>
                            <th>操作</th>
                        </tr>
                        </thead>
                        <tbody>
                        {this.getPushList()}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }
}
