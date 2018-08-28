import * as React from 'react';
// import ReactDom from 'react-dom';
// import {Link} from 'react-router-dom';
import { observer, inject } from 'mobx-react';
import { UserProps } from '../user.model';
import BreadCrumb from '../../../components/breadcrumb';
import {Form, Input} from 'antd';
import md5 from 'md5';

@inject('userStore')
@observer
class UserEditPwdForm extends React.Component<UserProps,any> {
    public userStore:any;

    constructor(props) {
        super(props);
        this.userStore = this.props.userStore;
    }
    componentDidMount() {
        // this.listenTo(UserStore, this.handleTrigger.bind(this));
    }
    /**
     * hanle trigger
     * @param  {[type]} data [description]
     * @param  {[type]} type [description]
     * @return {[type]}      [description]
     */
    // handleTrigger(data, type) {
    //     switch(type) {
    //         case 'saveUserFail':
    //             this.setState({submitting: false});
    //             break;
    //         case 'saveUserSuccess':
    //             TipAction.success('更新成功');
    //             this.setState({submitting: false});
    //             break;
    //     }
    // }
    /**
     * save
     * @return {}       []
     */
    handleValidSubmit(values) {
        delete values.repassword;
        let password = md5(window.SysConfig.options.password_salt + values.password);
        values.password = password;
        this.userStore.setUserEditPwdState({submitting:true});
        // this.setState({submitting: true});
        this.userStore.savePwd(values);
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
     * 获取属性
     * @param  {[type]} type [description]
     * @return {[type]}      [description]
     */
    // getProps(type) {
    //     let prop = {
    //         value: this.state.userInfo[type] || '',
    //         // onChange: this.changeInput.bind(this, type)
    //     };
    //
    //     let validatePrefix = '';
    //     let validates = {
    //         name: 'isLength:4:20',
    //         email: 'isEmail',
    //         password: val => {
    //
    //             if(val === '') {
    //                 return '请输出密码';
    //             }
    //
    //             if(val.length < 8 || val.length > 30) {
    //                 return '密码长度为8到30个字符';
    //             }
    //
    //             return true;
    //         },
    //         repassword: (val, context) => val === context.password
    //     }
    //     if(typeof validates[type] === 'string') {
    //         prop.validate = validatePrefix + validates[type];
    //     }else{
    //         prop.validate = validates[type];
    //     }
    //
    //     return prop;
    // }

    /**
     * render
     * @return {} []
     */
    render() {
        let props = {}
        if(this.userStore.userEditPwdState.submitting) {
            props.disabled = true;
        }
        const FormItem = Form.Item;
        const { getFieldDecorator } = this.props.form;

        let options = window.SysConfig.options;
        let ldapOn = options.ldap_on === '1' ? true : false;
        let ldap_whiteList = options.ldap_whiteList ? options.ldap_whiteList.split(',') : [];
        let userName = window.SysConfig.userInfo && window.SysConfig.userInfo.name || '';

        if(ldapOn && ldap_whiteList.indexOf(userName) === -1) {
            let ldap_user_page = options.ldap_user_page;
            return (
                <div className="fk-content-wrap">
                    <BreadCrumb {...this.props} />
                    <div className="manage-container">
                        <h3 style={{marginBottom: '20px'}}>LDAP提示</h3>
                        <p>本系统已开启LDAP认证服务，LDAP服务开启后用户的用户名、密码、邮箱、别名均由LDAP统一管理，本系统不能修改。</p>
                        <div className="alert alert-warning" role="alert">
                            如需要修改，请使用给本系统提供LDAP服务的
                            { ldap_user_page ? <a href={ldap_user_page} target="_blank">用户管理服务</a> : '用户管理服务' }
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
                                    rules: [{
                                        min: 8,
                                        max: 30,
                                        message: '长度为8到30个字符'
                                    }]
                                })(<Input type='password' placeholder="长度为8到30个字符"></Input>)}
                                <p className="help-block">建议使用特殊字符与字母、数字的混编方式，增加安全性。</p>
                            </FormItem>
                            <FormItem label="确认密码">
                                {getFieldDecorator('repassword',{
                                    rules: [{
                                        required: true, message: '请再次确认密码!',
                                    }, {
                                        validator: this.compareToFirstPassword,
                                    }]
                                })(<Input type='password' placeholder="请再次输入密码"></Input>)}
                            </FormItem>
                            {/*<div className="form-group">*/}
                                {/*<label>密码</label>*/}
                                {/*<ValidatedInput*/}
                                    {/*type="password"*/}
                                    {/*name="password"*/}
                                    {/*ref="password"*/}
                                    {/*className="form-control"*/}
                                    {/*placeholder="8到30个字符"*/}
                                    {/*{...this.getProps('password')}*/}
                                {/*/>*/}
                                {/*<p className="help-block">建议使用特殊字符与字母、数字的混编方式，增加安全性。</p>*/}
                            {/*</div>*/}
                            {/*<div className="form-group ">*/}
                                {/*<label>确认密码</label>*/}
                                {/*<ValidatedInput*/}
                                    {/*type="password"*/}
                                    {/*name="repassword"*/}
                                    {/*ref="repassword"*/}
                                    {/*className="form-control"*/}
                                    {/*placeholder=""*/}
                                    {/*{...this.getProps('repassword')}*/}
                                    {/*errorHelp='密码不一致'*/}
                                {/*/>*/}
                            {/*</div>*/}
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