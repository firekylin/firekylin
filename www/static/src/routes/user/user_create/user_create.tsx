import * as React from 'react';
import ReactDom from 'react-dom';
// import {Link} from 'react-router-dom';
import { observer, inject } from 'mobx-react';
// import UserAction from '../action/user';
import { UserProps } from '../user.model';
import BreadCrumb from '../../../components/breadcrumb';
import {Form, message, Input ,Select} from 'antd';
import md5 from 'md5';
// import {create} from "domain";
// import UserStore from '../store/user';
// import ModalAction from '../../common/action/modal';
// import TipAction from 'common/action/tip';

@inject('userStore')
@observer
class UserCreateForm extends React.Component<UserProps,any> {

    private id:number;
    public userStore:any;

    constructor(props) {
        super(props);
        this.userStore = this.props.userStore;
        // this.state = this.initialState();
        this.id = this.props.match.params.id | 0;
        // console.log('id',this.id);
    }

    // initialState() {
    //     return {
    //         submitting: false,
    //         userInfo: {},
    //         hasEmail: false
    //     };
    // }

    componentDidMount() {
        // this.listenTo(UserStore, this.handleTrigger.bind(this));
        if(this.id) {
            this.userStore.select(this.id);
            // console.log('userInfo',this.userStore.userInfo);
        }
    }

    componentWillReceiveProps(nextProps) {
        this.id = nextProps.match.params.id | 0;
        if(this.id) {
            this.userStore.select(this.id);
        }
        // this.setState(this.initialState());
    }

    // /**
    //  * hanle trigger
    //  * @param  {[type]} data [description]
    //  * @param  {[type]} type [description]
    //  * @return {[type]}      [description]
    //  */
    // handleTrigger(data, type) {
    //     switch(type) {
    //         case 'saveUserFail':
    //             this.setState({submitting: false});
    //             break;
    //         case 'saveUserSuccess':
    //             TipAction.success(this.id ? '保存成功' : '添加成功');
    //             this.setState({submitting: false});
    //             setTimeout(() => this.redirect('user/list'), 1000);
    //             break;
    //         case 'getUserInfo':
    //             this.setState({userInfo: data, hasEmail: !!data.email});
    //             break;
    //     }
    // }
    /**
     * save
     * @return {}       []
     */
    handleValidSubmit(e) {
        // values.type = ReactDom.findDOMNode(this.refs.type).value;
        // values.status = ReactDom.findDOMNode(this.refs.status).value;
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                delete values.repassword;
                if(this.id && values.password === '') {
                    delete values.password;
                } else {
                    let password = md5(window.SysConfig.options.password_salt + values.password);
                    values.password = password;
                }
                this.userStore.setSubmitting(true);
                if(this.id) {
                    values.id = this.id;
                }
                // debugger;
                this.userStore.save(values,()=>{
                    message.success(this.id ? '保存成功' : '添加成功');
                    this.userStore.setSubmitting(false);
                    setTimeout(() => this.redirect('user/list'), 1000);
                },()=>{
                    message.error('保存失败');
                    // debugger;
                    this.userStore.setSubmitting(false);
                });
            }
        });

    }

    generateKey() {
        this.userStore.generateKey(this.id,(data)=>{
            // this.setState({userInfo: data, hasEmail: !!data.email});
            this.userStore.setUserInfo(data);
            this.userStore.setHasEmail(!!data.email);
        },(err)=>{});
    }
    /**
     * handle invalid
     * @return {} []
     */
    handleInvalidSubmit() {

    }
    /**
     * change input value
     * @param  {[type]} type  [description]
     * @param  {[type]} event [description]
     * @return {[type]}       [description]
     */
    // changeInput(type, event) {
    //     let value = event.target.value;
    //     let userInfo = this.userStore.userInfo;
    //     userInfo[type] = value;
    //     this.userStore.setUserInfo(userInfo);
    // }
    /**
     * 获取属性
     * @param  {[type]} type [description]
     * @return {[type]}      [description]
     */
    getProps(type) {
        let prop = {
            value: this.userStore.userInfo[type] || '',
            // onChange: this.changeInput.bind(this, type)
        };
        if(this.id && ['name', 'email'].indexOf(type) > -1) {
            if(type === 'email') {
                if(this.userStore.hasEmail) {
                    prop.readOnly = true;
                }
            }else{
                prop.readOnly = true;
            }
        }

        let options = window.SysConfig.options;
        let ldapOn = options.ldap_on === '1' ? true : false;
        let ldap_whiteList = options.ldap_whiteList ? options.ldap_whiteList.split(',') : [];
        let editUserName = this.userStore.userInfo.name || '';
        if(this.id && ldapOn && ['type', 'status'].indexOf(type) === -1 && ldap_whiteList.indexOf(editUserName) === -1) {
            prop.readOnly = true;
        }

        // let validatePrefix = '';
        // if(!this.id && ['name', 'email'].indexOf(type) > -1) {
        //     validatePrefix = 'required,';
        // }
        // let validates = {
        //     name: 'isLength:4:20',
        //     email: 'isEmail',
        //     password: val => {
        //         //编辑时可以不用输入用户名
        //         if(this.id && val === '') {
        //             return true;
        //         }
        //
        //         if(val === '') {
        //             return '请输出密码';
        //         }
        //
        //         if(val.length < 8 || val.length > 30) {
        //             return '密码长度为8到30个字符';
        //         }
        //
        //         return true;
        //     },
        //     repassword: (val, context) => val === context.password
        // }
        // if(typeof validates[type] === 'string') {
        //     prop.validate = validatePrefix + validates[type];
        // }else{
        //     prop.validate = validates[type];
        // }

        return prop;
    }

    getOptionProp(type, value) {
        let val = this.userStore.userInfo[type];
        if(val === value) {
            return {selected: true}
        }
        return {};
    }

    /**
     * render
     * @return {} []
     */
    render() {
        let props = {}
        if(this.userStore.submitting) {
            props.disabled = true;
        }
        let options = window.SysConfig.options;
        let ldapOn = options.ldap_on === '1';
        const FormItem = Form.Item;
        const Option = Select.Option;
        const { getFieldDecorator } = this.props.form;

        if(!this.id && ldapOn) {
            let ldap_user_page = options.ldap_user_page;
            return (
                <div className="fk-content-wrap">
                    <BreadCrumb {...this.props} />
                    <div className="manage-container">
                        <h3 style={{marginBottom: '20px'}}>LDAP提示</h3>
                        <p>本系统已开启LDAP认证服务，LDAP服务开启后，本系统不能新增用户，且用户的用户名、密码、邮箱、别名均由LDAP统一管理，本系统不能修改。</p>
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
                        className="user-create clearfix"
                        onSubmit={this.handleValidSubmit.bind(this)}
                    >
                        <div className="pull-left">
                            <FormItem label="用户名">
                                {getFieldDecorator('username',{
                                    rules: [{
                                            min: 4,
                                            max: 20,
                                            message: '长度为4到20个字符'
                                        },
                                        {
                                            required: true,
                                            message: '请输入用户名!'
                                        }]
                                })(<Input placeholder="4-20个字符"></Input>)}
                                <p className="help-block">登录时所用的名称，不能重复。</p>
                            </FormItem>
                            {/*<div className="form-group">*/}
                                {/*<label>用户名</label>*/}
                                {/*<ValidatedInput*/}
                                    {/*type="text"*/}
                                    {/*name="username"*/}
                                    {/*ref="username"*/}
                                    {/*className="form-control"*/}
                                    {/*placeholder="4到20个字符"*/}
                                    {/*{...this.getProps('name')}*/}
                                    {/*errorHelp={{*/}
                                        {/*required: '请输入用户名',*/}
                                        {/*isLength: '长度为4到20个字符'*/}
                                    {/*}}*/}
                                {/*/>*/}
                                {/*<p className="help-block">登录时所用的名称，不能重复。</p>*/}
                            {/*</div>*/}
                            <FormItem label="邮箱">
                                {getFieldDecorator('email',{
                                    rules: [{
                                            required: true,
                                            message: '请输入邮箱!'
                                        }]
                                })(<Input placeholder="输入邮箱"></Input>)}
                                <p className="help-block">用户主要联系方式，不能重复。</p>
                            </FormItem>
                            {/*<div className="form-group">*/}
                                {/*<label>邮箱</label>*/}
                                {/*<ValidatedInput*/}
                                    {/*type="text"*/}
                                    {/*name="email"*/}
                                    {/*ref="email"*/}
                                    {/*className="form-control"*/}
                                    {/*{...this.getProps('email')}*/}
                                    {/*errorHelp={{*/}
                                        {/*required: '请输入邮箱',*/}
                                        {/*isEmail: '邮箱格式不正确'*/}
                                    {/*}}*/}
                                {/*/>*/}
                                {/*<p className="help-block">用户主要联系方式，不能重复。</p>*/}
                            {/*</div>*/}
                            <FormItem label="密码">
                                {getFieldDecorator('password',{
                                    rules: [{
                                        min: 8,
                                        max: 30,
                                        message: '长度为8到30个字符'
                                    }]
                                })(<Input placeholder="长度为8到30个字符"></Input>)}
                                <p className="help-block">建议使用特殊字符与字母、数字的混编方式，增加安全性。</p>
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
                            <FormItem label="确认密码">
                                {getFieldDecorator('repassword',{
                                    rules: [{
                                        min: 8,
                                        max: 30,
                                        message: '长度为8到30个字符'
                                    }]
                                })(<Input placeholder="长度为8到30个字符"></Input>)}
                            </FormItem>
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
                                {this.userStore.submitting ? '提交中...' : '提交'}
                            </button>
                        </div>
                        <div className="pull-left">
                            <FormItem label="别名">
                                {getFieldDecorator('display_name',{
                                })(<Input placeholder="显示名称"></Input>)}
                            </FormItem>
                            {/*<div className="form-group">*/}
                                {/*<label>别名</label>*/}
                                {/*<ValidatedInput*/}
                                    {/*type="text"*/}
                                    {/*name="display_name"*/}
                                    {/*ref="display_name"*/}
                                    {/*className="form-control"*/}
                                    {/*placeholder="显示名称"*/}
                                    {/*{...this.getProps('display_name')}*/}
                                {/*/>*/}
                            {/*</div>*/}
                            {/*<FormItem label="用户组">*/}
                                {/*{getFieldDecorator('username',{*/}
                                {/*})(<Input placeholder="显示名称"></Input>)}*/}
                            {/*</FormItem>*/}
                            <FormItem label="用户组">
                                {getFieldDecorator('type',{
                                })(<Select className="form-control">
                                    <Option value="2">编辑</Option>
                                    <Option value="1">管理员</Option>
                                    <Option value="3">投稿者</Option>
                                </Select>)}
                            </FormItem>
                            {/*<div className="form-group">*/}
                                {/*<label>用户组</label>*/}
                                {/*<Select className="form-control" ref="type">*/}
                                    {/*<Option value="2">编辑</Option>*/}
                                    {/*<Option value="1">管理员</Option>*/}
                                    {/*<Option value="3">投稿者</Option>*/}
                                {/*</Select>*/}
                            {/*</div>*/}
                            <FormItem label="状态">
                                {getFieldDecorator('status',{
                                })(<Select className="form-control">
                                        <Option value="1">有效</Option>
                                        <Option value="2">禁用</Option>
                                    </Select>)}
                            </FormItem>
                            {/*<div className="form-group">*/}
                                {/*<label>状态</label>*/}
                                {/*<Select className="form-control" ref="status">*/}
                                    {/*<Option value="1">有效</Option>*/}
                                    {/*<Option value="2">禁用</Option>*/}
                                {/*</Select>*/}
                            {/*</div>*/}
                            <filedset>
                                <legend>
                                    认证
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        style={{marginLeft: 15, marginBottom: 5, padding: '3px 5px'}}
                                        onClick={this.generateKey.bind(this)}
                                    >重新生成</button>
                                </legend>
                                {/*<div className="form-group">*/}
                                    {/*<label>App Key</label>*/}
                                    {/*<div>*/}
                                        {/*<input type="text" className="form-control" disabled={true}*/}
                                               {/*value={this.userStore.userInfo.app_key} />*/}
                                    {/*</div>*/}
                                {/*</div>*/}
                                {/*<div className="form-group">*/}
                                    {/*<label>App Secret</label>*/}
                                    {/*<input type="text" className="form-control" disabled={true}*/}
                                           {/*value={this.userStore.userInfo.app_secret} />*/}
                                {/*</div>*/}
                            </filedset>
                        </div>
                    </Form>
                </div>
            </div>
        );
    }

}
const UserCreate = Form.create()(UserCreateForm);
export default UserCreate;
