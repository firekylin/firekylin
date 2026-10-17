import * as React from 'react';
import { observer, inject } from '@admin/utils/mobx-react';
import BreadCrumb from '../../../components/breadcrumb';
import { Form, FormInstance } from 'antd';
import { Input } from 'antd';
import md5 from 'md5';
import UserStore from '../user.store';

interface UserEditPWDProps {
    userStore: UserStore;
}
function UserEditPwdForm(props: UserEditPWDProps) {
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
        legacy.formRef = React.createRef<FormInstance>();

        legacy.userStore = props.userStore;
        legacy.handleValidSubmit = (values: any) => {
            delete values.repassword;
            let password = md5(window.SysConfig.options.password_salt + values.password);
            values.password = password;
            legacy.userStore.setUserEditPwdState({ submitting: true });
            // this.setState({submitting: true});
            legacy.userStore.savePwd(values);
        };
        legacy.compareToFirstPassword = (rule, value, callback) => {
            if (value && value !== legacy.formRef.current?.getFieldValue('password')) {
                callback('两次输入密码不一致!');
            } else {
                callback();
            }
        };
    }
    legacy.render = function render() {
        let props = {
            disabled: false,
        };
        if (legacy.userStore.userEditPwdState.submitting) {
            props.disabled = true;
        }

        let options = window.SysConfig.options;
        let ldapOn = options.ldap_on === '1' ? true : false;
        let ldapWhiteList = options.ldap_whiteList
            ? options.ldap_whiteList.split(',')
            : [];
        let userName =
            (window.SysConfig.userInfo && window.SysConfig.userInfo.name) || '';

        if (ldapOn && ldapWhiteList.indexOf(userName) === -1) {
            let ldap_user_page = options.ldap_user_page;
            return (
                <div className="fk-content-wrap">
                    <BreadCrumb {...props} />
                    <div className="manage-container">
                        <h3 style={{ marginBottom: '20px' }}>LDAP提示</h3>
                        <p>
                            本系统已开启LDAP认证服务，LDAP服务开启后用户的用户名、密码、邮箱、别名均由LDAP统一管理，本系统不能修改。
                        </p>
                        <div className="alert alert-warning" role="alert">
                            如需要修改，请使用给本系统提供LDAP服务的
                            {ldap_user_page ? (
                                <a href={ldap_user_page} target="_blank">
                                    用户管理服务
                                </a>
                            ) : (
                                '用户管理服务'
                            )}
                            ，或者联系系统管理员。
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="fk-content-wrap">
                <BreadCrumb {...props} />
                <div className="manage-container">
                    <Form
                        ref={legacy.formRef}
                        className="user-editpwd clearfix"
                        onFinish={legacy.handleValidSubmit}
                        scrollToFirstError
                    >
                        <div className="pull-left">
                            <Form.Item
                                label="密码"
                                name="password"
                                rules={[
                                    { required: true, message: '请输入密码!' },
                                    {
                                        min: 8,
                                        max: 30,
                                        message: '长度为8到30个字符',
                                    },
                                ]}
                            >
                                <Input type="password" placeholder="长度为8到30个字符" />
                            </Form.Item>
                            <p className="help-block">
                                建议使用特殊字符与字母、数字的混编方式，增加安全性。
                            </p>
                            <Form.Item
                                label="确认密码"
                                name="repassword"
                                rules={[
                                    { required: true, message: '请再次确认密码!' },
                                    {
                                        validator: legacy.compareToFirstPassword,
                                    },
                                ]}
                            >
                                <Input type="password" placeholder="请再次输入密码" />
                            </Form.Item>
                            <button type="submit" {...props} className="btn btn-primary">
                                {legacy.userStore.userEditPwdState.submitting
                                    ? '提交中...'
                                    : '提交'}
                            </button>
                        </div>
                    </Form>
                </div>
            </div>
        );
    };
    return legacy.render();
}

export default inject('userStore')(observer(UserEditPwdForm));
