import React from 'react';
import { Form, Input, Button, Radio } from 'antd';
import { LDAPProps } from '../ldap.model';
import RadioGroup from 'antd/lib/radio/group';
const FormItem = Form.Item;
interface LDAPStep2Props extends LDAPProps {
    ldapSave: (values: any) => void;
}

class LDAPStep2Form extends React.Component<LDAPStep2Props, {}> {
    constructor(props: LDAPStep2Props) {
        super(props);
    }
    handleSubmit(e: React.FormEvent<any>) {
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                this.props.ldapSave(values);
            }
        });
    }
    render() {
        const { getFieldDecorator } = this.props.form;
        const { options } = this.props.ldapStore.data;
        return (
            <div style={{maxWidth: 512}}>
                <p>LDAP服务，需要填写以下信息</p>
                <Form onSubmit={e => this.handleSubmit(e)}>
                    <FormItem
                        label="LDAP URL"
                    >
                        {getFieldDecorator('ldap_url', {
                            rules: [
                                {required: true, message: '填写 LDAP URL'}
                            ],
                            initialValue: options.ldap_url || ''
                        })(
                            <Input placeholder="ldap://xxx.xxx.xxx.xxx:xx" type="text" />
                        )}
                    </FormItem>
                    <p>待连接的LDAP地址</p>
                    {/* LDAP 连接超时时间(单位：ms) */}
                    <FormItem
                        label="LDAP 连接超时时间(单位：ms)"
                    >
                        {getFieldDecorator('ldap_connect_timeout', {
                            rules: [
                                {required: true, message: '填写 LDAP 连接超时时间'}
                            ],
                            initialValue: options.ldap_connect_timeout || 5000,
                        })(
                            <Input placeholder="ldap://xxx.xxx.xxx.xxx:xx" type="number" />
                        )}
                    </FormItem>
                    {/* 填写 LDAP baseDn */}
                    <FormItem
                        label="LDAP baseDn"
                    >
                        {getFieldDecorator('ldap_baseDn', {
                            rules: [
                                {required: true, message: '填写 LDAP baseDn'}
                            ],
                            initialValue: options.ldap_baseDn || ''
                        })(
                            <Input placeholder="dc=xxx,dc=xxx,dc=com" type="text" />
                        )}
                    </FormItem>
                    {/* LDAP 个人信息修改页地址 */}
                    <FormItem
                        label="LDAP 个人信息修改页地址"
                    >
                        {getFieldDecorator('ldap_user_page', {
                            rules: [
                                {required: true, message: '填写正确的URL'},
                            ],
                            initialValue: options.ldap_user_page || ''
                        })(
                            <Input placeholder="http://xxx.xx.xx" type="url" />
                        )}
                    </FormItem>
                    <p>该项配置后，用户能点击链接跳转到该配置页，快捷修改用户个人信息</p>
                    {/* LDAP 白名单 */}
                    <FormItem
                        label="LDAP 白名单"
                    >
                        {getFieldDecorator('ldap_whiteList', {
                            initialValue: options.ldap_whiteList || ''
                        })(
                            <Input type="text" placeholder="admin" />
                        )}
                    </FormItem>
                    <p>名单中的的用户名不通过LDAP登录，例如平台初始管理员，直接使用博客平台用户数据，多个用户名用英文“<code>,</code> ”隔开</p>
                    {/* 是否打开 LDAP 日志开关 */}
                    <FormItem
                        label="是否打开 LDAP 日志开关"
                    >
                        {getFieldDecorator('ldap_log', {
                            initialValue: options.ldap_log || '1',
                        })(
                            <RadioGroup>
                                <Radio value="1">是</Radio>
                                <Radio value="0">否</Radio>
                            </RadioGroup>
                        )}
                        <p>打开开关，后台打印LDAP操作日志</p>
                    </FormItem>
                    <FormItem>
                        <Button type="primary" htmlType="submit">确定</Button>
                    </FormItem>
                </Form>
            </div>
        );
    }
}

const LDAPStep2 = Form.create()(LDAPStep2Form);
export default LDAPStep2;