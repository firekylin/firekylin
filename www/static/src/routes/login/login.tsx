import * as React from 'react';
import classnames from 'classnames';
import {
    GlobalOutlined,
    LockOutlined,
    SafetyOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Form, FormInstance } from 'antd';
import { Input, Button, Checkbox } from 'antd';
import { observer, inject } from '@admin/utils/mobx-react';
import { LoginProps } from './login.model';
import facebookIcon from '../../assets/social/facebook.svg';
import githubIcon from '../../assets/social/github.svg';
import googleIcon from '../../assets/social/google.svg';
import huaweiIcon from '../../assets/social/huawei.svg';
import oidcIcon from '../../assets/social/oidc.svg';
import qqIcon from '../../assets/social/qq.svg';
import twitterIcon from '../../assets/social/twitter.svg';
import weiboIcon from '../../assets/social/weibo.svg';
function LoginForm(props: LoginProps) {
    const [state, setState] = React.useState(() => ({
        forgot: false,
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
        legacy.formRef = React.createRef<FormInstance>();
    }
    legacy.handleTrigger = function handleTrigger(data: any, type: string) {
        switch (type) {
            case 'LoginSuccess':
                // TipAction.success('登录成功');
                setTimeout(() => {
                    location.reload();
                }, 1000);
                break;
            case 'forgotSuccess':
                // TipAction.success('重置密码邮件发送成功');
                break;
            case 'forgotFail':
                // TipAction.fail(data.message);
                break;
            case 'resetSuccess':
                // TipAction.success('新密码设置成功');
                setTimeout(() => (location.href = '/admin'), 1000);
                break;
            case 'resetFail':
                // TipAction.fail(data.message);
                break;
            default:
            //
        }
    };
    legacy.getTwoFactorAuth = function getTwoFactorAuth(): JSX.Element | null {
        if (window.SysConfig.options.two_factor_auth) {
            return (
                <Form.Item
                    name="two_factor_auth"
                    rules={[
                        { len: 6, message: '长度为6个字符' },
                        {
                            required: true,
                            message: '请填写二步验证码',
                        },
                    ]}
                >
                    <Input
                        prefix={<SafetyOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                        type="text"
                        placeholder="二步验证码"
                    />
                </Form.Item>
            );
        }
        return null;
    };
    legacy.handleSubmit = function handleSubmit(values: any) {
        props.loginStore.login(values);
    };
    legacy.handleForgotSubmit = function handleForgotSubmit(values: any) {
        props.loginStore.forgot(values);
    };
    legacy.handleResetSubmit = function handleResetSubmit(values: any) {
        const search = props.location.search;
        const token = new URLSearchParams(search).get('token');
        props.loginStore.reset({ password: values.password, token: token });
    };
    legacy.toggleForgot = function toggleForgot() {
        legacy.setState({ forgot: !legacy.state.forgot });
    };
    legacy.getSocialLogin = function getSocialLogin() {
        const services = window.SysConfig.options.social_services || [];
        if (!services.length) return null;
        const icons: Record<string, string> = {
            facebook: facebookIcon,
            github: githubIcon,
            google: googleIcon,
            huawei: huaweiIcon,
            oidc: oidcIcon,
            qq: qqIcon,
            twitter: twitterIcon,
            weibo: weiboIcon,
        };
        const queryRedirect = new URLSearchParams(props.location.search).get('redirect');
        let redirect = `${window.location.origin}/admin`;
        if (queryRedirect) {
            const target = new URL(queryRedirect, window.location.origin);
            if (target.origin === window.location.origin) redirect = target.href;
        }
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 16,
                    margin: '-4px 0 20px',
                }}
            >
                {services.map((service) => {
                    const icon = icons[service.name];
                    const href = `/api/comment/oauth?type=${encodeURIComponent(service.name)}&redirect=${encodeURIComponent(redirect)}`;
                    return (
                        <a
                            key={service.name}
                            href={href}
                            title={service.title || service.name}
                            style={{
                                display: 'inline-flex',
                                width: 32,
                                height: 32,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {icon ? (
                                <img
                                    src={icon}
                                    alt={service.title || service.name}
                                    width="32"
                                    height="32"
                                />
                            ) : (
                                <GlobalOutlined style={{ fontSize: 28 }} />
                            )}
                        </a>
                    );
                })}
            </div>
        );
    };
    legacy.renderReset = function renderReset() {
        return (
            <div className="container">
                <div className="row forgot">
                    <h1 className="text-center">
                        <a href="/">{window.SysConfig.options.title}</a>
                    </h1>
                    <Form
                        ref={legacy.formRef}
                        onFinish={(values) => legacy.handleResetSubmit(values)}
                        className="login-form"
                        scrollToFirstError
                    >
                        <Form.Item
                            name="password"
                            rules={[
                                { min: 8, max: 20, message: '密码长度为8到30个字符' },
                                {
                                    required: true,
                                    message: '请填写密码!',
                                },
                            ]}
                        >
                            <Input
                                prefix={
                                    <LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />
                                }
                                type="text"
                                placeholder="请输入新密码"
                            />
                        </Form.Item>
                        <Form.Item>
                            <Button
                                block
                                type="primary"
                                htmlType="submit"
                                className="login-form-button"
                                loading={props.loginStore.loading}
                                size="large"
                            >
                                设置新密码
                            </Button>
                        </Form.Item>
                    </Form>
                    <div className="form-footer">
                        <div className="left back-site">
                            <a href="/">← 回到{window.SysConfig.options.title}</a>
                        </div>
                        <div className="right forgot-password">
                            <a href="/admin">重新登录</a>
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    legacy.renderForgot = function renderForgot() {
        return (
            <div className="container">
                <div className="row forgot">
                    <h1 className="text-center">
                        <a href="/">{window.SysConfig.options.title}</a>
                    </h1>
                    <Form
                        ref={legacy.formRef}
                        onFinish={(values) => legacy.handleForgotSubmit(values)}
                        className="login-form"
                        scrollToFirstError
                    >
                        <Form.Item
                            name="user"
                            extra="您会收到一封包含创建新密码链接的电子邮件。"
                            rules={[
                                {
                                    required: true,
                                    message: '请输入您的用户名或电子邮箱地址!',
                                },
                            ]}
                        >
                            <Input
                                prefix={
                                    <UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />
                                }
                                type="text"
                                placeholder="用户名或电子邮箱地址"
                            />
                        </Form.Item>
                        <Form.Item>
                            <Button
                                block
                                type="primary"
                                htmlType="submit"
                                className="login-form-button"
                                loading={props.loginStore.loading}
                                size="large"
                            >
                                获取新密码
                            </Button>
                        </Form.Item>
                    </Form>
                    <div className="form-footer">
                        <div className="left back-site">
                            <a href="/">← 回到{window.SysConfig.options.title}</a>
                        </div>
                        <div className="right forgot-password">
                            <a
                                href="javascript:void(0)"
                                onClick={() => legacy.toggleForgot()}
                            >
                                重新登录
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    legacy.render = function render() {
        const search = props.location.search;
        const reset = new URLSearchParams(search).get('reset');
        if (reset) {
            return legacy.renderReset();
        }

        if (legacy.state.forgot) {
            return legacy.renderForgot();
        }

        return (
            <div className="container">
                <div className="row">
                    <div className="login">
                        <h1 className="text-center">
                            <a href="/">{window.SysConfig.options.title}</a>
                        </h1>
                        <Form
                            ref={legacy.formRef}
                            onFinish={(values) => legacy.handleSubmit(values)}
                            className="login-form"
                            scrollToFirstError
                        >
                            <Form.Item
                                name="username"
                                rules={[
                                    { min: 4, max: 30, message: '长度为4到30个字符' },
                                    {
                                        required: true,
                                        message: '请输入用户名!',
                                    },
                                ]}
                            >
                                <Input
                                    prefix={
                                        <UserOutlined
                                            style={{ color: 'rgba(0,0,0,.25)' }}
                                        />
                                    }
                                    type="text"
                                    placeholder="用户名"
                                />
                            </Form.Item>
                            <Form.Item
                                name="password"
                                rules={[{ required: true, message: '请输入密码!' }]}
                            >
                                <Input
                                    prefix={
                                        <LockOutlined
                                            style={{ color: 'rgba(0,0,0,.25)' }}
                                        />
                                    }
                                    type="password"
                                    placeholder="密码"
                                />
                            </Form.Item>
                            {legacy.getTwoFactorAuth()}
                            <Form.Item>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 8,
                                    }}
                                >
                                    <Form.Item
                                        name="remember"
                                        valuePropName="checked"
                                        initialValue={true}
                                        noStyle
                                    >
                                        <Checkbox style={{ fontWeight: 'normal' }}>
                                            自动登录
                                        </Checkbox>
                                    </Form.Item>
                                    <div
                                        className={classnames(
                                            'right',
                                            'forgot-password',
                                            {
                                                hidden:
                                                    window.SysConfig.options.ldap_on ===
                                                    '1',
                                            },
                                        )}
                                    >
                                        {!window.SysConfig.options.intranet ? null : (
                                            <a href="/admin/user/intranet">域账号登录</a>
                                        )}
                                        {!window.SysConfig.options.intranet ? null : (
                                            <a href="javascript:void(0)"> | </a>
                                        )}
                                        <a
                                            href="javascript:void(0)"
                                            onClick={() => legacy.toggleForgot()}
                                        >
                                            找回密码
                                        </a>
                                    </div>
                                </div>
                                <Button
                                    block
                                    type="primary"
                                    htmlType="submit"
                                    className="login-form-button"
                                    loading={props.loginStore.loading}
                                >
                                    登录
                                </Button>
                            </Form.Item>
                        </Form>
                        {legacy.getSocialLogin()}
                        <div className="form-footer">
                            <div className="left back-site">
                                <a href="/">← 回到{window.SysConfig.options.title}</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    return legacy.render();
}

export default inject('loginStore')(observer(LoginForm));
