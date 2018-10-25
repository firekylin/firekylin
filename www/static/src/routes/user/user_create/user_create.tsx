import * as React from 'react';
import { observer, inject } from 'mobx-react';
// import { UserProps } from '../user.model';
import BreadCrumb from '../../../components/breadcrumb';
import { Form, message, Input, Select } from 'antd';
import md5 from 'md5';
import { FormComponentProps } from 'antd/lib/form';
import UserStore from '../user.store';
import { RouteComponentProps } from 'react-router';

interface UserCreateProps extends FormComponentProps, RouteComponentProps<any> {
    userStore: UserStore;
}

@inject('userStore')
@observer
class UserCreateForm extends React.Component<UserCreateProps, any> {

    private id: string;
    public userStore: any;

    constructor(props: UserCreateProps) {
        super(props);
        this.userStore = this.props.userStore;
        this.id = this.props.match.params.id;
        this.setUserInfoEmpty();
    }

    componentDidMount() {
        if (this.id) {
            this.userStore.getUserInfo(this.id);
        } else {
            this.setUserInfoEmpty();
        }

    }

    componentWillReceiveProps(nextProps: any) {
        this.id = nextProps.match.params.id;
        if (this.id) {
            this.userStore.getUserInfo(this.id);
        } else {
            this.setUserInfoEmpty();
        }
    }

    // 置空User列表
    setUserInfoEmpty() {
        this.userStore.setUserInfo({
            name: '',
            display_name: '',
            status: '',
            type: '',
            email: '',
            app_key: '',
            app_secret: ''
        });
    }

    /**
     * save
     * @return {}       []
     */
    handleValidSubmit(e: React.FormEvent<any>) {
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                delete values.repassword;
                if (this.id && values.password === '') {
                    delete values.password;
                } else {
                    let password = md5(window.SysConfig.options.password_salt + values.password);
                    values.password = password;
                }
                this.userStore.setSubmitting(true);
                if (this.id) {
                    values.id = this.id;
                }

                this.userStore.saveUser(values, () => {
                    message.success(this.id ? '保存成功' : '添加成功');
                    this.userStore.setSubmitting(false);
                    setTimeout(() => this.props.history.push('/user/list'), 1000);
                },                      () => {
                    message.error('保存失败');
                    this.userStore.setSubmitting(false);
                });
            }
        });

    }

    // 生成密钥
    generateKey() {
        if (this.id) {
            this.userStore.generateKey(this.id);
        }
    }

    /**
     * 获取readonly属性
     * @param  {[type]} type [description]
     * @return {[type]}      [description]
     */
    isDisabled(type: string) {
        let prop = {
            disabled: false
            // value: this.userStore.userInfo[type] || '',
            // onChange: this.changeInput.bind(this, type)
        };
        if (this.id && ['name', 'email'].indexOf(type) > -1) {
            if (type === 'email') {
                if (this.userStore.hasEmail) {
                    prop.disabled = true;
                }
            } else {
                prop.disabled = true;
            }
        }

        let options = window.SysConfig.options;
        let ldapOn = options.ldap_on === '1' ? true : false;
        let ldapWhiteList = options.ldap_whiteList ? options.ldap_whiteList.split(',') : [];
        let editUserName = this.userStore.userInfo.name || '';
        if (this.id && ldapOn && ['type', 'status'].indexOf(type) === -1 && ldapWhiteList.indexOf(editUserName) === -1) {
            prop.disabled = true;
        }

        return prop;
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
        const { userInfo } = this.props.userStore;
        let props = {
            disabled: false,
        };
        if (this.userStore.submitting) {
            props.disabled = true;
        }
        let options = window.SysConfig.options;
        let ldapOn = options.ldap_on === '1';
        const FormItem = Form.Item;
        const Option = Select.Option;
        const { getFieldDecorator } = this.props.form;

        if (!this.id && ldapOn) {
            let ldap_user_page = options.ldap_user_page;
            return (
                <div className="fk-content-wrap">
                    <BreadCrumb {...this.props} />
                    <div className="manage-container">
                        <h3 style={{marginBottom: '20px'}}>LDAP提示</h3>
                        <p>本系统已开启LDAP认证服务，LDAP服务开启后，本系统不能新增用户，且用户的用户名、密码、邮箱、别名均由LDAP统一管理，本系统不能修改。</p>
                        <div className="alert alert-warning" role="alert">
                            如需要修改，请使用给本系统提供LDAP服务的
                            {ldap_user_page ? <a href={ldap_user_page} target="_blank">用户管理服务</a> : '用户管理服务'}
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
                        className="user-create clearfix"
                        onSubmit={this.handleValidSubmit.bind(this)}
                    >
                        <div className="pull-left">
                            <FormItem label="用户名">
                                {getFieldDecorator('username', {
                                    rules: [{
                                            min: 4,
                                            max: 20,
                                            message: '长度为4到20个字符'
                                        },
                                        {
                                            required: true,
                                            message: '请输入用户名!'
                                        }],
                                    initialValue: userInfo.name ? userInfo.name : '',
                                })(<Input {...this.isDisabled('name')} placeholder="4-20个字符"/>)}
                                <p className="help-block">登录时所用的名称，不能重复。</p>
                            </FormItem>
                            <FormItem label="邮箱">
                                {getFieldDecorator('email', {
                                    rules: [{
                                            required: true,
                                            message: '请输入邮箱!'
                                        }, {
                                        type: 'email',
                                        message: '邮箱格式错误!'
                                    }],
                                    initialValue: userInfo.email ? userInfo.email : '',
                                })(<Input {...this.isDisabled('email')} autoComplete="email" placeholder="输入邮箱"/>)}
                                <p className="help-block">用户主要联系方式，不能重复。</p>
                            </FormItem>
                            <FormItem label="密码">
                                {getFieldDecorator('password', {
                                    rules: [{
                                        required: true, message: '请输入密码!',
                                    }, {
                                        min: 8,
                                        max: 30,
                                        message: '长度为8到30个字符'
                                    }],
                                })(<Input {...this.isDisabled('password')} type="password" placeholder="长度为8到30个字符" />)}
                                <p className="help-block">建议使用特殊字符与字母、数字的混编方式，增加安全性。</p>
                            </FormItem>
                            <FormItem label="确认密码">
                                {getFieldDecorator('repassword', {
                                    rules: [{
                                        required: true, message: '请再次确认密码!',
                                    }, {
                                        validator: this.compareToFirstPassword,
                                    }]
                                })(<Input {...this.isDisabled('repassword')} type="password" placeholder="请再次输入密码" />)}
                            </FormItem>
                            <button type="submit" {...props} className="btn btn-primary">
                                {this.userStore.submitting ? '提交中...' : '提交'}
                            </button>
                        </div>
                        <div className="pull-left">
                            <FormItem label="别名">
                                {getFieldDecorator('display_name', {
                                    initialValue: userInfo.display_name ? userInfo.display_name : '',
                                })(<Input {...this.isDisabled('display_name')} placeholder="显示名称" />)}
                            </FormItem>
                            <FormItem label="用户组">
                                {getFieldDecorator('type', {
                                    initialValue:  userInfo.type ? userInfo.type.toString() : '',
                                })(<Select {...this.isDisabled('type')} className="form-control">
                                    <Option value="2">编辑</Option>
                                    <Option value="1">管理员</Option>
                                    <Option value="3">投稿者</Option>
                                </Select>)}
                            </FormItem>
                            <FormItem label="状态">
                                {getFieldDecorator('status', {
                                    initialValue: userInfo.status ? userInfo.status.toString() : '',
                                })(<Select {...this.isDisabled('status')} className="form-control">
                                        <Option value="1">有效</Option>
                                        <Option value="2">禁用</Option>
                                    </Select>)}
                            </FormItem>
                            {/*<filedset>*/}
                                <legend>
                                    认证
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        style={{marginLeft: 15, marginBottom: 5, padding: '3px 5px'}}
                                        onClick={() => this.generateKey()}
                                    >重新生成</button>
                                </legend>
                                <div className="form-group">
                                    <label>App Key</label>
                                    <div>
                                        <Input type="text" className="form-control" disabled={true}
                                               value={this.userStore.userInfo.app_key} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>App Secret</label>
                                    <Input type="text" className="form-control" disabled={true}
                                           value={this.userStore.userInfo.app_secret} />
                                </div>
                            {/*</filedset>*/}
                        </div>
                    </Form>
                </div>
            </div>
        );
    }

}
const UserCreate = Form.create()(UserCreateForm);
export default UserCreate;
