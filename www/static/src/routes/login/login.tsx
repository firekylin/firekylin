import * as React from 'react';
import classnames from 'classnames';
import { Input, Form, Icon, Button, Checkbox } from 'antd';
import { observer, inject } from 'mobx-react';
import { LoginProps } from './login.model';
const FormItem = Form.Item;

@inject('loginStore')
@observer
class LoginForm extends React.Component<LoginProps, any> {
  state = {
    forgot: false,
  };
  constructor(props: any) {
    super(props);
  }

  handleTrigger(data: any, type: string) {
    switch (type) {
      case 'LoginSuccess':
        // TipAction.success('登录成功');
        setTimeout(() => { location.reload(); }, 1000);
        break;
      case 'forgotSuccess':
        // TipAction.success('重置密码邮件发送成功');
        break;
      case 'forgotFail':
        // TipAction.fail(data.message);
        break;
      case 'resetSuccess':
        // TipAction.success('新密码设置成功');
        setTimeout(() => location.href = '/admin', 1000);
        break;
      case 'resetFail':
        // TipAction.fail(data.message);
        break;
      default:
      // 
    }
  }
  /**
   * get two factor auth
   * @return {} []
   */
  getTwoFactorAuth(): JSX.Element | null {
    const { getFieldDecorator } = this.props.form;
    if (window.SysConfig.options.two_factor_auth) {
      return (
        <Form onSubmit={e => this.handleForgotSubmit(e)} className="login-form">
          <FormItem>
            {getFieldDecorator('two_factor_auth', {
              rules: [{ len: 6, message: '长度为6个字符' }, {
                required: true,
                message: '请填写二步验证码'
              }],
            })(
              <Input prefix={<Icon type="safety" style={{ color: 'rgba(0,0,0,.25)' }} />} type="text" placeholder="二步验证码" />
            )}
          </FormItem>
        </Form>
      );
    }
    return null;
  }
  // 登录
  handleSubmit(event: React.FormEvent<any>) {
    event.preventDefault();
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        this.props.loginStore.login(values);
      }
    });
  }
  // 重置密码
  handleForgotSubmit(event: React.FormEvent<any>) {
    event.preventDefault();
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        this.props.loginStore.forgot(values);
      }
    });
  }

  handleResetSubmit(event: React.FormEvent<any>) {
    event.preventDefault();
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        const search = this.props.location.search;
        const token = new URLSearchParams(search).get('token');
        this.props.loginStore.reset({ password: values.password, token: token });
      }
    });
  }

  toggleForgot() {
    this.setState({ forgot: !this.state.forgot });
  }

  renderReset() {
    const { getFieldDecorator } = this.props.form;
    return (
      <div className="container">
        <div className="row forgot">
          <h1 className="text-center">
            <a href="/">{window.SysConfig.options.title}</a>
          </h1>
          <Form onSubmit={e => this.handleResetSubmit(e)} className="login-form">
            <FormItem>
              {getFieldDecorator('password', {
                rules: [{ min: 8, max: 20, message: '密码长度为8到30个字符' }, {
                  required: true,
                  message: '请填写密码!'
                }],
              })(
                <Input prefix={<Icon type="lock" style={{ color: 'rgba(0,0,0,.25)' }} />} type="text" placeholder="请输入新密码" />
              )}
            </FormItem>
            <FormItem>
              <Button
                style={{ width: '100%' }}
                type="primary"
                htmlType="submit"
                className="login-form-button"
                loading={this.props.loginStore.loading}
                size="large"
              >
                设置新密码
                </Button>
            </FormItem>
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
  }

  renderForgot() {
    const { getFieldDecorator } = this.props.form;
    return (
      <div className="container">
        <div className="row forgot">
          <h1 className="text-center">
            <a href="/">{window.SysConfig.options.title}</a>
          </h1>
          <Form onSubmit={e => this.handleForgotSubmit(e)} className="login-form">
            <FormItem
              extra="您会收到一封包含创建新密码链接的电子邮件。"
            >
              {getFieldDecorator('user', {
                rules: [{
                  required: true,
                  message: '请输入您的用户名或电子邮箱地址!'
                }],
              })(
                <Input prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />} type="text" placeholder="用户名或电子邮箱地址" />
              )}
            </FormItem>
            <FormItem>
              <Button
                style={{ width: '100%' }}
                type="primary"
                htmlType="submit"
                className="login-form-button"
                loading={this.props.loginStore.loading}
                size="large"
              >
                获取新密码
                </Button>
            </FormItem>
          </Form>
          <div className="form-footer">
            <div className="left back-site">
              <a href="/">← 回到{window.SysConfig.options.title}</a>
            </div>
            <div className="right forgot-password">
              <a href="javascript:void(0)" onClick={() => this.toggleForgot()}>重新登录</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const search = this.props.location.search;
    const reset = new URLSearchParams(search).get('reset');
    if (reset) {
      return this.renderReset();
    }

    if (this.state.forgot) {
      return this.renderForgot();
    }

    const { getFieldDecorator } = this.props.form;

    return (
      <div className="container">
        <div className="row">
          <div className="login">
            <h1 className="text-center">
              <a href="/">{window.SysConfig.options.title}</a>
            </h1>
            <Form onSubmit={e => this.handleSubmit(e)} className="login-form">
              <FormItem>
                {getFieldDecorator('username', {
                  rules: [{ min: 4, max: 20, message: '长度为4到20个字符' }, {
                    required: true,
                    message: '请输入用户名!'
                  }],
                })(
                  <Input prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />} type="text" placeholder="用户名" />
                )}
              </FormItem>
              <FormItem>
                {getFieldDecorator('password', {
                  rules: [{ required: true, message: '请输入密码!' }],
                })(
                  <Input prefix={<Icon type="lock" style={{ color: 'rgba(0,0,0,.25)' }} />} type="password" placeholder="密码" />
                )}
              </FormItem>
              {this.getTwoFactorAuth()}
              <FormItem>
                {getFieldDecorator('remember', {
                  valuePropName: 'checked',
                  initialValue: true,
                })(
                  <Checkbox style={{ fontWeight: 'normal' }}>自动登录</Checkbox>
                )}

                <div className={classnames('right', 'forgot-password', {
                  hidden: window.SysConfig.options.ldap_on === '1'
                })}>
                  {!window.SysConfig.options.intranet ? null : <a href="/admin/user/intranet">域账号登录</a>}
                  {!window.SysConfig.options.intranet ? null : <a href="javascript:void(0)"> | </a>}
                  <a href="javascript:void(0)" onClick={() => this.toggleForgot()}>找回密码</a>
                </div>
                <Button
                  style={{ width: '100%' }}
                  type="primary"
                  htmlType="submit"
                  className="login-form-button"
                  loading={this.props.loginStore.loading}
                >
                  登录
                  </Button>
              </FormItem>
            </Form>
            <div className="form-footer">
              <div className="left back-site">
                <a href="/">← 回到{window.SysConfig.options.title}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const Login = Form.create()(LoginForm);
export default Login;