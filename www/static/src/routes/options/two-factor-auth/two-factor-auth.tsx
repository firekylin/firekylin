import React from 'react';
import { Form, Input, Button, Modal, Alert, message } from 'antd';
import { inject, observer } from 'mobx-react';
import QRCode from 'qrcode.react';
const FormItem = Form.Item;
const confirm = Modal.confirm;
import BreadCrumb from '../../../components/breadcrumb';
import { TwoFactorAuthProps } from './two-factor-auth.model';
import './two-factor-auth.less';

@inject('twoFactorAuthStore')
@observer
class TwoFactorAuthForm extends React.Component<TwoFactorAuthProps, {}> {
    state = {
        options: window.SysConfig.options,
        step: 1,
    };

    constructor(props: TwoFactorAuthProps) {
        super(props);
    }

    componentDidMount() {
        this.getQRCode();
    }

    handleSubmit = (e: React.FormEvent<any>) => {
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                const data = {
                    code: values.code,
                    secret: this.props.twoFactorAuthStore.data.secret,
                };
                this.props.twoFactorAuthStore.authQRCode(data)
                .subscribe(
                    res => {
                        if (res.errno === 0) {
                            this.updateStep(4);                            
                        }
                    }
                );
                // request

            }
        });
    }

    getQRCode() {
        this.props.twoFactorAuthStore.getQRCode();
    }

    close2Fa() {
        confirm({
            title: '确定关闭吗？',
            content: '二次验证可以大大提升账户的安全性',
            onOk: () => {
                this.props.twoFactorAuthStore.close2FA()
                .subscribe(
                    res => {
                        if (res.errno === 0) {
                            message.success('关闭二步验证成功');
                            window.SysConfig.options.two_factor_auth = '';
                            this.forceUpdate();
                        }
                    }
                );
            }
        });
    }

    open2Fa() {
        this.props.twoFactorAuthStore.open2FA()
        .subscribe(
            res => {
                if (res.errno === 0) {
                    message.success('开启二步验证成功');
                    window.SysConfig.options.two_factor_auth = this.props.twoFactorAuthStore.data.secret;
                    this.forceUpdate();
                }
            }
        );
    }

    updateStep(step: number) {
        this.setState({
          step: step || 1
        });
    }

    step0() {
        const { otpauth_url } = this.props.twoFactorAuthStore.data;
        return (
            <div>
                <p>已经开启两步验证</p>
                <QRCode value={otpauth_url} size={256} />,
                <br />
                <br />
                <Button type="primary" htmlType="submit" onClick={() => this.close2Fa()}>关闭二步验证</Button>
            </div>
        );
    }

    step1() {
        return (
            <div>
                <p>两步验证，对应的英文是 Two-factor Authentication(2FA)，或者 Two-step Verification。从名字可以看出，
                    「两步」是 2FA 的重点，广义的 2FA 是指提供多种方案完成用户权限鉴定。</p>
                <p>开启两步验证后，登录系统后台，除了要提供用户名和密码外，还要提供额外的 Token，这样可以大大提高系统的安全性。</p>
                <Alert
                    message="为了提升系统安全性，本系统的两步验证开启后对所有人有效。"
                    type="warning"
                    style={{marginBottom: 20}}
                />
                <Button type="primary" htmlType="submit" onClick={() => this.updateStep(2)}>下一步</Button>
            </div>
        );
    }

    step2() {
        return (
            <div>
                <h4>下载对应的应用</h4>
                <ul className="step2-apps">
                    <li>For Android, iOS:
                        <a href="https://support.google.com/accounts/answer/1066447?hl=en"> Google Authenticator</a>
                    </li>
                    <li>For Android and iOS:
                        <a href="http://guide.duosecurity.com/third-party-accounts"> Duo Mobile</a>
                    </li>
                    <li>For Windows Phone:
                        <a href="https://www.microsoft.com/en-US/store/apps/Authenticator/9WZDNCRFJ3RJ"> Authenticator</a>
                    </li>
                </ul>
                <Button type="primary" htmlType="submit" onClick={() => this.updateStep(3)}>已经安装，下一步</Button>
            </div>
        );
    }

    step3() {
        const { getFieldDecorator } = this.props.form;
        const { otpauth_url } = this.props.twoFactorAuthStore.data;
        return (
            <div>
                <p>打开两步验证的应用，扫描下面的二维码</p>
                <QRCode value={otpauth_url} size={256} />
                <Form onSubmit={this.handleSubmit}>
                    <FormItem
                        // {...formItemLayout}
                        label="填写 6 位校验码"
                    >
                        {getFieldDecorator('code', {
                            rules: [
                                {required: true, message: '填写 6 位校验码'},
                                {len: 6, message: '请填写 6 位校验码'},
                            ]
                        })(
                            <Input type="number" style={{width: 256}} />
                        )}
                    </FormItem>
                    <FormItem>
                        <Button type="primary" htmlType="submit">验证</Button>
                    </FormItem>
                </Form>
            </div>
        );
    }

    step4() {
        return (
            <div>
                <p>验证成功，点击下面的按钮开启二步验证</p>
                <Button type="primary" htmlType="submit" onClick={() => this.open2Fa()}>开启两步验证</Button>
            </div>
        );
    }

    getContent() {
        if (this.state.options.two_factor_auth) {
            return this.step0();
        }
        switch (this.state.step) {
            case 1:
                return this.step1();
            case 2:
                return this.step2();
            case 3:
                return this.step3();
            case 4:
                return this.step4();
            default:
                return this.step1();
        }
    }
    
    render() {
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="option-2fa-page page-list">
                    <h3 className="page-title">两步验证</h3>
                    {this.getContent()}
                </div>
            </>
        );
    }
}
const TwoFactorAuth = Form.create()(TwoFactorAuthForm);
export default TwoFactorAuth;
