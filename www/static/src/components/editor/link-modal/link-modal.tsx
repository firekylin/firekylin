import * as React from 'react';
import { Input, Modal, Tabs, Form, Select } from 'antd';
import { ModalProps } from 'antd/lib/modal';
import { FormComponentProps } from 'antd/lib/form';
const TabPane = Tabs.TabPane;
const FormItem = Form.Item;
const Option = Select.Option;
interface EditorLinkModalProps extends ModalProps, FormComponentProps {
    onCreate: () => void;
    fetchData: (keyword: string) => void;
    innerLinks: any[];
}

class EditorLinkModalForm extends React.Component<EditorLinkModalProps, any> {
    constructor(props: any) {
        super(props);
    }

    handleChange = value => {
        const selectedLink = this.props.innerLinks.filter(
            link => link.title === value,
        )[0];
        const pathname = selectedLink.pathname;
        const title = selectedLink.title;
        this.props.form.setFieldsValue({
            innerLinkUrl: pathname,
        });
        this.props.form.setFieldsValue({
            innerLinkText: title,
        });
    }

    render() {
        const { onCancel, onCreate, form } = this.props;
        const { getFieldDecorator } = form;
        const { innerLinks } = this.props;
        const formItemLayout = {
            labelCol: {
                xl: { span: 4 },
            },
            wrapperCol: {
                xl: { span: 20 },
            },
        };
        return (
            <Modal
                title="插入链接"
                visible={this.props.visible}
                onOk={onCreate}
                onCancel={onCancel}
            >
                <Tabs
                    className="tabs"
                    defaultActiveKey="0"
                    type="card"
                    style={{ padding: 20 }}
                >
                    <TabPane tab="插入外链" key="0">
                        <Form>
                            <FormItem {...formItemLayout} label="链接地址：">
                                {getFieldDecorator('linkUrl')(<Input />)}
                            </FormItem>
                            <FormItem {...formItemLayout} label="链接文本：">
                                {getFieldDecorator('linkText')(<Input />)}
                            </FormItem>
                        </Form>
                    </TabPane>
                    <TabPane tab="插入内链" key="1">
                        <Form>
                            <FormItem {...formItemLayout} label="链接文本：">
                                {getFieldDecorator('innerLinkText')(
                                    <Select
                                        showSearch={true}
                                        placeholder="请输入文章标题"
                                        style={this.props.style}
                                        defaultActiveFirstOption={false}
                                        showArrow={false}
                                        filterOption={false}
                                        onSearch={this.props.fetchData}
                                        onChange={this.handleChange}
                                        notFoundContent="未找到文章"
                                    >
                                        {innerLinks.map((d: any) => (
                                            <Option key={d.id} value={d.title}>
                                                {d.title}
                                            </Option>
                                        ))}
                                    </Select>,
                                )}
                            </FormItem>
                            <FormItem {...formItemLayout} label="链接地址：">
                                {getFieldDecorator('innerLinkUrl')(<Input />)}
                            </FormItem>
                        </Form>
                    </TabPane>
                </Tabs>
            </Modal>
        );
    }
}

const EditorLinkModal = Form.create()(EditorLinkModalForm);

export default EditorLinkModal;
