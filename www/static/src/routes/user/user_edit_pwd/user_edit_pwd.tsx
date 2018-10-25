import * as React from 'react';
import { observer, inject } from 'mobx-react';
import BreadCrumb from '../../../components/breadcrumb';
import { Form, Input } from 'antd';
import md5 from 'md5';
import { FormComponentProps } from 'antd/lib/form';
import UserStore from '../user.store';

interface UserEditPWDProps extends FormComponentProps {
    userStore: UserStore;
}

@inject('userStore')
@observer
class UserEditPwdForm extends React.Component<UserEditPWDProps, any> {
    public userStore: any;

    constructor(props: UserEditPWDProps) {
        super(props);
        this.userStore = this.props.userStore;
    }

    /**
     * save
     * @return {}       []
     */
    handleValidSubmit(e: any) {
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                delete values.repassword;
                let password = md5(window.SysConfig.options.password_salt + values.password);
                values.password = password;
                this.userStore.setUserEditPwdState({submitting: true});
                // this.setState({submitting: true});
                this.userStore.savePwd(values);
            }
        });
    }

    compareToFirstPassword = (rule, value, callback) => {
        const form = this.props.form;
        if (value && value !== form.getFieldValue('password')) {
            callback('两次输入密码不一致!');
        } else {
            callback();
        }
    }

    /**
     * render
     * @return {} []
     */
    render() {
        let props = {
            disabled: false,
        };
        if (this.userStore.userEditPwdState.submitting) {
            props.disabled = true;
        }
        const FormItem = Form.Item;
        const { getFieldDecorator } = this.props.form;

        let options = window.SysConfig.options;
        let ldapOn = options.ldap_on === '1' ? true : false;
        let ldapWhiteList = options.ldap_whiteList ? options.ldap_whiteList.split(',') : [];
        let userName = window.SysConfig.userInfo && window.SysConfig.userInfo.name || '';

        if (ldapOn && ldapWhiteList.indexOf(userName) === -1) {
            let ldap_user_page = options.ldap_user_page;
            return (
                <div className="fk-content-wrap">
                    <BreadCrumb {...this.props} />
                    <div className="manage-container">
                        <h3 style={{marginBottom: '20px'}}>LDAP提示</h3>
                        <p>本系统已开启LDAP认证服务，LDAP服务开启后用户的用户名、密码、邮箱、别名均由LDAP统一管理，本系统不能修改。</p>
                        <div className="alert alert-warning" role="alert">
                            如需要修改，请使用给本系统提供LDAP服务的
                            { ldap_user_page ? <a href={ldap_user_page} target="_blank">用户管理服务</a> : '用户管理服务'}
                            ，或者联系系统管理员。
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="fk-content-wrap">
                <BreadCrumb {...this.props} />
                <div className="manage-container">
                    <Form
                        className="user-editpwd clearfix"
                        onSubmit={this.handleValidSubmit.bind(this)}
                    >
                        <div className="pull-left">
                            <FormItem label="密码">
                                {getFieldDecorator('password',{
                                    rules: [{ required: true, message: '请输入密码!'}, {
                                        min: 8,
                                        max: 30,
                                        message: '长度为8到30个字符'
                                    }]
                                })(<Input type="password" placeholder="长度为8到30个字符" />)}
                                <p className="help-block">建议使用特殊字符与字母、数字的混编方式，增加安全性。</p>
                            </FormItem>
                            <FormItem label="确认密码">
                                {getFieldDecorator('repassword', {
                                    rules: [{required: true, message: '请再次确认密码!'}, {
                                        validator: this.compareToFirstPassword,
                                    }]
                                })(<Input type="password" placeholder="请再次输入密码" />)}
                            </FormItem>
                            <button type="submit" {...props} className="btn btn-primary">
                                {this.userStore.userEditPwdState.submitting ? '提交中...' : '提交'}
                            </button>
                        </div>
                    </Form>
                </div>
            </div>
        );
    }
}
const UserEditPwd = Form.create()(UserEditPwdForm);
export default UserEditPwd;