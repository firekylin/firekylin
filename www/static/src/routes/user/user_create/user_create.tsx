import * as React from 'react';
import { observer, inject } from '@admin/utils/mobx-react';
// import { UserProps } from '../user.model';
import BreadCrumb from '../../../components/breadcrumb';
import { Form, FormInstance } from 'antd';
import { message, Input, Select, Button, Space, Tag } from 'antd';
import md5 from 'md5';
import UserStore from '../user.store';
import { RouteComponentProps } from '@admin/utils/router';

interface UserCreateProps extends RouteComponentProps<any> {
    userStore: UserStore;
}
export function UserCreateForm(props: UserCreateProps) {
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
    legacy.setUserInfoEmpty = function setUserInfoEmpty() {
        legacy.userStore.setUserInfo({
            name: '',
            display_name: '',
            status: '',
            type: '',
            email: '',
            app_key: '',
            app_secret: '',
        });
    };
    if (!legacy.__initialized) {
        legacy.__initialized = true;
        legacy.formRef = React.createRef<FormInstance>();

        legacy.userStore = props.userStore;
        legacy.id = props.match.params.id;
        legacy.setUserInfoEmpty();
        legacy.handleValidSubmit = (values: any) => {
            delete values.repassword;
            if (legacy.id && !values.password) {
                delete values.password;
            } else {
                let password = md5(
                    window.SysConfig.options.password_salt + values.password,
                );
                values.password = password;
            }
            legacy.userStore.setSubmitting(true);
            if (legacy.id) {
                values.id = legacy.id;
            }

            legacy.userStore.saveUser(
                values,
                () => {
                    message.success(legacy.id ? '保存成功' : '添加成功');
                    legacy.userStore.setSubmitting(false);
                    const target =
                        window.SysConfig.userInfo.type === 4
                            ? `/user/edit/${legacy.id}`
                            : '/user/list';
                    setTimeout(() => props.history.push(target), 1000);
                },
                () => {
                    message.error('保存失败');
                    legacy.userStore.setSubmitting(false);
                },
            );
        };
        legacy.compareToFirstPassword = (rule, value, callback) => {
            if (value && value !== legacy.formRef.current?.getFieldValue('password')) {
                callback('两次输入密码不一致!');
            } else {
                callback();
            }
        };
    }
    legacy.onMount = function onMount() {
        if (legacy.id) {
            legacy.userStore.getUserInfo(legacy.id);
        } else {
            legacy.setUserInfoEmpty();
        }
    };
    legacy.afterUpdate = function afterUpdate(prevProps: any) {
        if (prevProps.match.params.id !== props.match.params.id) {
            legacy.id = props.match.params.id;
            if (legacy.id) {
                legacy.userStore.getUserInfo(legacy.id);
            } else {
                legacy.setUserInfoEmpty();
            }
            return;
        }
        const { userInfo } = props.userStore;
        legacy.formRef.current?.setFieldsValue({
            username: userInfo.name,
            email: userInfo.email,
            display_name: userInfo.display_name,
            type: userInfo.type ? userInfo.type.toString() : '',
            status: userInfo.status ? userInfo.status.toString() : '',
        });
    };
    legacy.generateKey = function generateKey() {
        if (legacy.id) {
            legacy.userStore.generateKey(legacy.id);
        }
    };
    legacy.bindSocial = function bindSocial(provider: string) {
        const redirect = `${window.location.origin}/admin/user/edit/${legacy.id}`;
        window.location.href = `/api/comment/oauth?type=${encodeURIComponent(provider)}&redirect=${encodeURIComponent(redirect)}`;
    };
    legacy.isDisabled = function isDisabled(type: string) {
        let prop = {
            disabled: false, // value: this.userStore.userInfo[type] || '',
            // onChange: this.changeInput.bind(null, type)
        };
        if (legacy.id && ['name', 'email'].indexOf(type) > -1) {
            if (type === 'email') {
                if (
                    legacy.userStore.userInfo.email &&
                    window.SysConfig.userInfo.type !== 4
                ) {
                    prop.disabled = true;
                }
            } else {
                prop.disabled = true;
            }
        }
        let options = window.SysConfig.options;
        let ldapOn = options.ldap_on === '1' ? true : false;
        let ldapWhiteList = options.ldap_whiteList
            ? options.ldap_whiteList.split(',')
            : [];
        let editUserName = legacy.userStore.userInfo.name || '';
        if (
            legacy.id &&
            ldapOn &&
            ['type', 'status'].indexOf(type) === -1 &&
            ldapWhiteList.indexOf(editUserName) === -1
        ) {
            prop.disabled = true;
        }
        return prop;
    };
    legacy.render = function render() {
        const { userInfo } = props.userStore;
        const isCommenter = window.SysConfig.userInfo.type === 4;
        let formProps = {
            disabled: false,
        };
        if (legacy.userStore.submitting) {
            formProps.disabled = true;
        }
        let options = window.SysConfig.options;
        let ldapOn = options.ldap_on === '1';
        const Option = Select.Option;

        if (!legacy.id && ldapOn) {
            let ldap_user_page = options.ldap_user_page;
            return (
                <div className="fk-content-wrap">
                    <BreadCrumb {...props} />
                    <div className="manage-container">
                        <h3 style={{ marginBottom: '20px' }}>LDAP提示</h3>
                        <p>
                            本系统已开启LDAP认证服务，LDAP服务开启后，本系统不能新增用户，且用户的用户名、密码、邮箱、别名均由LDAP统一管理，本系统不能修改。
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
                        className="user-create clearfix"
                        onFinish={legacy.handleValidSubmit}
                        scrollToFirstError
                    >
                        <div className="pull-left">
                            <Form.Item
                                label="用户名"
                                name="username"
                                rules={[
                                    {
                                        min: 4,
                                        max: 20,
                                        message: '长度为4到20个字符',
                                    },
                                    {
                                        required: true,
                                        message: '请输入用户名!',
                                    },
                                ]}
                            >
                                <Input
                                    {...legacy.isDisabled('name')}
                                    placeholder="4-20个字符"
                                />
                            </Form.Item>
                            <p className="help-block">登录时所用的名称，不能重复。</p>
                            <Form.Item
                                label="邮箱"
                                name="email"
                                rules={[
                                    {
                                        required: true,
                                        message: '请输入邮箱!',
                                    },
                                    {
                                        type: 'email',
                                        message: '邮箱格式错误!',
                                    },
                                ]}
                            >
                                <Input
                                    {...legacy.isDisabled('email')}
                                    autoComplete="email"
                                    placeholder="输入邮箱"
                                />
                            </Form.Item>
                            <p className="help-block">用户主要联系方式，不能重复。</p>
                            <Form.Item
                                label="密码"
                                name="password"
                                rules={[
                                    {
                                        required: !legacy.id,
                                        message: '请输入密码!',
                                    },
                                    {
                                        min: 8,
                                        max: 30,
                                        message: '长度为8到30个字符',
                                    },
                                ]}
                            >
                                <Input
                                    {...legacy.isDisabled('password')}
                                    type="password"
                                    placeholder="长度为8到30个字符"
                                />
                            </Form.Item>
                            <p className="help-block">
                                建议使用特殊字符与字母、数字的混编方式，增加安全性。
                            </p>
                            <Form.Item
                                label="确认密码"
                                name="repassword"
                                rules={[
                                    {
                                        required: !legacy.id,
                                        message: '请再次确认密码!',
                                    },
                                    {
                                        validator: legacy.compareToFirstPassword,
                                    },
                                ]}
                            >
                                <Input
                                    {...legacy.isDisabled('repassword')}
                                    type="password"
                                    placeholder="请再次输入密码"
                                />
                            </Form.Item>
                            <button type="submit" {...formProps} className="btn btn-primary">
                                {legacy.userStore.submitting ? '提交中...' : '提交'}
                            </button>
                        </div>
                        <div className="pull-left">
                            <Form.Item label="别名" name="display_name">
                                <Input
                                    {...legacy.isDisabled('display_name')}
                                    placeholder="显示名称"
                                />
                            </Form.Item>
                            {!isCommenter ? (
                                <Form.Item label="用户组" name="type">
                                    <Select
                                        {...legacy.isDisabled('type')}
                                        className="form-control"
                                    >
                                        <Option value="2">编辑</Option>
                                        <Option value="1">管理员</Option>
                                        <Option value="3">投稿者</Option>
                                    </Select>
                                </Form.Item>
                            ) : null}
                            {!isCommenter ? (
                                <Form.Item label="状态" name="status">
                                    <Select
                                        {...legacy.isDisabled('status')}
                                        className="form-control"
                                    >
                                        <Option value="1">有效</Option>
                                        <Option value="2">禁用</Option>
                                    </Select>
                                </Form.Item>
                            ) : null}
                            {/*<filedset>*/}
                            {!isCommenter ? (
                                <>
                                    <legend>
                                        认证
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            style={{
                                                marginLeft: 15,
                                                marginBottom: 5,
                                                padding: '3px 5px',
                                            }}
                                            onClick={() => legacy.generateKey()}
                                        >
                                            重新生成
                                        </button>
                                    </legend>
                                    <div className="form-group">
                                        <label>App Key</label>
                                        <div>
                                            <Input
                                                type="text"
                                                className="form-control"
                                                disabled={true}
                                                value={legacy.userStore.userInfo.app_key}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>App Secret</label>
                                        <Input
                                            type="text"
                                            className="form-control"
                                            disabled={true}
                                            value={legacy.userStore.userInfo.app_secret}
                                        />
                                    </div>
                                </>
                            ) : null}
                            {String(window.SysConfig.userInfo.id) ===
                            String(legacy.id) ? (
                                <div className="form-group">
                                    <legend>社交账号</legend>
                                    <Space direction="vertical" align="start">
                                        {(userInfo.social_services || []).map(
                                            (service) => {
                                                const account = (
                                                    userInfo.social_accounts || []
                                                ).find(
                                                    (item) =>
                                                        item.provider === service.name,
                                                );
                                                return (
                                                    <Space key={service.name}>
                                                        <Tag
                                                            color={
                                                                account
                                                                    ? 'green'
                                                                    : 'default'
                                                            }
                                                        >
                                                            {service.title ||
                                                                service.name}
                                                        </Tag>
                                                        {account ? (
                                                            <Button
                                                                size="small"
                                                                danger
                                                                onClick={() =>
                                                                    legacy.userStore.unlinkSocial(
                                                                        service.name,
                                                                    )
                                                                }
                                                            >
                                                                解绑
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="small"
                                                                onClick={() =>
                                                                    legacy.bindSocial(
                                                                        service.name,
                                                                    )
                                                                }
                                                            >
                                                                绑定
                                                            </Button>
                                                        )}
                                                    </Space>
                                                );
                                            },
                                        )}
                                    </Space>
                                </div>
                            ) : null}
                            {/*</filedset>*/}
                        </div>
                    </Form>
                </div>
            </div>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    const previousRef = React.useRef({ props: props, state: state, mounted: false });
    React.useEffect(() => {
        if (previousRef.current.mounted)
            legacy.afterUpdate(
                previousRef.current.props,
                previousRef.current.state,
            );
        previousRef.current = { props: props, state: state, mounted: true };
    });
    return legacy.render();
}

export default inject('userStore')(observer(UserCreateForm));
