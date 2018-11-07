import React from 'react';
import { Form, Button, Modal, Alert, message } from 'antd';
import { inject, observer } from 'mobx-react';
import BreadCrumb from '../../../components/breadcrumb';
import './ldap.less';
import { LDAPProps } from './ldap.model';
import LDAPStep2 from './ldap-step2/ldap-step2';
const confirm = Modal.confirm;

enum LDAPEnum {
    ON = '1',
    OFF = '0',
}

@inject('ldapStore')
@observer
class LDAPForm extends React.Component<LDAPProps, {}> {

    constructor(props: LDAPProps) {
        super(props);
    }

    componentDidMount() {
        // 
    }

    updateStep(step: number) {
        this.props.ldapStore.setData({step: step || 1});
    }

    changeLdap() {
        this.updateStep(2);
    }

    closeLdap() {
        const { options } = this.props.ldapStore.data;
        const data = {
            ldap_on: LDAPEnum.OFF,
        };
        confirm({
            title: '确定关闭吗？',
            content: <>
                        <p className="gray">关闭后，白名单内账号登录操作无影响，管理员账号可进行用户的增删改密码重置；</p>
                        <p className="gray">已登录过的LDAP账号所有数据均保留，但是密码不正确，需要用户找回密码或者白名单内管理员账号重置密码；</p>
                        <p className="gray">关闭后，可再次打开LDAP服务，系统自动保存上次配置。</p>
                    </>,
            onOk: () => {
                this.props.ldapStore.ldapClose(data)
                .subscribe(
                    res => {
                        if (res.errno === 0) {
                            message.success('关闭成功');
                            const newOptions = Object.assign({}, options, {ldap_on: LDAPEnum.OFF});
                            this.props.ldapStore.setData({
                                options: newOptions,
                                step: 1,
                            });
                        }
                    }
                );
            }
        });
    }

    ldapSave(values: any) {
        const { options } = this.props.ldapStore.data;
        const data = {
            ldap_on: LDAPEnum.ON,
            ...values
        };
        this.props.ldapStore.ldapSave(data)
        .subscribe(
            res => {
                if (res.errno === 0) {
                    message.success('操作成功');
                    const newOptions = Object.assign({}, options, data);
                    this.props.ldapStore.setData({
                        options: newOptions,
                        step: 0,
                    });
                }
            },
            err => {
                message.error(err);
            }
        );
    }

    step0() {
        return (
            <div>
                <p>LDAP服务已开启</p>
                <br />
                <Button type="primary" onClick={() => this.closeLdap()}>关闭LDAP</Button>
                <br />
                <br />
                <Button type="primary" onClick={() => this.changeLdap()}>更新LDAP配置</Button>
            </div>
        );
    }

    step1() {
        return (
            <div>
                <p>LDAP是 Light weight Directory Access Protocol（轻量级目录访问协议）的缩写。</p>
                <p>LDAP可以为各种应用系统提供一个标准的认证机制，所有系统就可以不再用独有的用户管理方法， 而是通过这种统一的认证机制进行用户认证，这样就解决了目前很多企业遇到的多平台软件管理时，身份认证的不统一和不安全的问题。</p>
                <p>开启LDAP服务后，该平台可以使用LDAP账号密码登录系统后台；</p>
                <p>
                  此时后台管理员不能进行用户的<code>新增</code>、<code>删除</code>、<code>密码修改</code>操作，
                  这些均由LDAP统一管理，每次登录更新该用户最新的用户数据到平台；平台可编辑用户的“用户组”、“状态”。
                </p>
                <Alert
                    message="如果在系统使用一段时间后开启LDAP服务，若登录用户名已存在则更新用户数据，文章等数据保持不变；如登录用户不存在，则平台会用LDAP账号信息新建账号"
                    type="warning"
                    style={{marginBottom: 20}}
                />
                <Button type="primary" onClick={() => this.updateStep(2)}>下一步</Button>
            </div>
        );
    }

    getContent() {
        const { options, step } = this.props.ldapStore.data;
        if (options.ldap_on && options.ldap_on === '1' && step === 0) {
            return this.step0();
        }
        switch (step) {
            case 1:
                return this.step1();
            case 2:
                return <LDAPStep2 ldapStore={this.props.ldapStore} ldapSave={(values) => this.ldapSave(values)} />;
            default:
                return this.step1();
        }
    }
    
    render() {
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="page-list">
                    <div className="option-ldap-page">
                        <h3 className="page-title">LDAP服务</h3>
                        {this.getContent()}
                    </div>
                </div>
            </>
        );
    }
}
const LDAP = Form.create()(LDAPForm);
export default LDAP;
