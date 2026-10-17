import React from 'react';
import { Form, FormInstance } from 'antd';
import { Input, Button, Modal, Alert, message } from 'antd';
import { inject, observer } from '@admin/utils/mobx-react';
import { QRCodeSVG } from 'qrcode.react';
const confirm = Modal.confirm;
import BreadCrumb from '../../../components/breadcrumb';
import { TwoFactorAuthProps } from './two-factor-auth.model';
import './two-factor-auth.less';
function TwoFactorAuthForm(props: TwoFactorAuthProps) {
    const [state, setState] = React.useState(() => ({
        options: window.SysConfig.options,
        step: 1,
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
        legacy.handleSubmit = (values: any) => {
            const data = {
                code: values.code,
                secret: props.twoFactorAuthStore.data.secret,
            };
            props.twoFactorAuthStore.authQRCode(data).subscribe((res) => {
                if (res.errno === 0) {
                    legacy.updateStep(4);
                }
            });
        };
    }
    legacy.onMount = function onMount() {
        legacy.getQRCode();
    };
    legacy.getQRCode = function getQRCode() {
        props.twoFactorAuthStore.getQRCode();
    };
    legacy.close2Fa = function close2Fa() {
        confirm({
            title: '确定关闭吗？',
            content: '二次验证可以大大提升账户的安全性',
            onOk: () => {
                props.twoFactorAuthStore.close2FA().subscribe((res) => {
                    if (res.errno === 0) {
                        message.success('关闭二步验证成功');
                        window.SysConfig.options.two_factor_auth = '';
                        legacy.setState({ options: { ...window.SysConfig.options } });
                    }
                });
            },
        });
    };
    legacy.open2Fa = function open2Fa() {
        props.twoFactorAuthStore.open2FA().subscribe((res) => {
            if (res.errno === 0) {
                message.success('开启二步验证成功');
                window.SysConfig.options.two_factor_auth =
                    props.twoFactorAuthStore.data.secret;
                legacy.setState({ options: { ...window.SysConfig.options } });
            }
        });
    };
    legacy.updateStep = function updateStep(step: number) {
        legacy.setState({
            step: step || 1,
        });
    };
    legacy.step0 = function step0() {
        const { otpauth_url } = props.twoFactorAuthStore.data;
        return (
            <div>
                <p>已经开启两步验证</p>
                <QRCodeSVG value={otpauth_url} size={256} />,
                <br />
                <br />
                <Button
                    type="primary"
                    htmlType="submit"
                    onClick={() => legacy.close2Fa()}
                >
                    关闭二步验证
                </Button>
            </div>
        );
    };
    legacy.step1 = function step1() {
        return (
            <div>
                <p>
                    两步验证，对应的英文是 Two-factor Authentication(2FA)，或者 Two-step
                    Verification。从名字可以看出， 「两步」是 2FA 的重点，广义的 2FA
                    是指提供多种方案完成用户权限鉴定。
                </p>
                <p>
                    开启两步验证后，登录系统后台，除了要提供用户名和密码外，还要提供额外的
                    Token，这样可以大大提高系统的安全性。
                </p>
                <Alert
                    message="为了提升系统安全性，本系统的两步验证开启后对所有人有效。"
                    type="warning"
                    style={{ marginBottom: 20 }}
                />

                <Button
                    type="primary"
                    htmlType="submit"
                    onClick={() => legacy.updateStep(2)}
                >
                    下一步
                </Button>
            </div>
        );
    };
    legacy.step2 = function step2() {
        return (
            <div>
                <h4>下载对应的应用</h4>
                <ul className="step2-apps">
                    <li>
                        For Android, iOS:
                        <a href="https://support.google.com/accounts/answer/1066447?hl=en">
                            {' '}
                            Google Authenticator
                        </a>
                    </li>
                    <li>
                        For Android and iOS:
                        <a href="http://guide.duosecurity.com/third-party-accounts">
                            {' '}
                            Duo Mobile
                        </a>
                    </li>
                    <li>
                        For Windows Phone:
                        <a href="https://www.microsoft.com/en-US/store/apps/Authenticator/9WZDNCRFJ3RJ">
                            {' '}
                            Authenticator
                        </a>
                    </li>
                </ul>
                <Button
                    type="primary"
                    htmlType="submit"
                    onClick={() => legacy.updateStep(3)}
                >
                    已经安装，下一步
                </Button>
            </div>
        );
    };
    legacy.step3 = function step3() {
        const { otpauth_url } = props.twoFactorAuthStore.data;
        return (
            <div>
                <p>打开两步验证的应用，扫描下面的二维码</p>
                <QRCodeSVG value={otpauth_url} size={256} />
                <Form
                    ref={legacy.formRef}
                    onFinish={legacy.handleSubmit}
                    layout="vertical"
                    scrollToFirstError
                >
                    <Form.Item
                        label="填写 6 位校验码"
                        name="code"
                        rules={[
                            { required: true, message: '填写 6 位校验码' },
                            { len: 6, message: '请填写 6 位校验码' },
                        ]}
                    >
                        <Input type="number" style={{ width: 256 }} />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            验证
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        );
    };
    legacy.step4 = function step4() {
        return (
            <div>
                <p>验证成功，点击下面的按钮开启二步验证</p>
                <Button
                    type="primary"
                    htmlType="submit"
                    onClick={() => legacy.open2Fa()}
                >
                    开启两步验证
                </Button>
            </div>
        );
    };
    legacy.getContent = function getContent() {
        if (legacy.state.options.two_factor_auth) {
            return legacy.step0();
        }
        switch (legacy.state.step) {
            case 1:
                return legacy.step1();
            case 2:
                return legacy.step2();
            case 3:
                return legacy.step3();
            case 4:
                return legacy.step4();
            default:
                return legacy.step1();
        }
    };
    legacy.render = function render() {
        return (
            <>
                <BreadCrumb className="breadcrumb" {...props} />
                <div className="option-2fa-page page-list">
                    <h3 className="page-title">两步验证</h3>
                    {legacy.getContent()}
                </div>
            </>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    return legacy.render();
}

export default inject('twoFactorAuthStore')(observer(TwoFactorAuthForm));
