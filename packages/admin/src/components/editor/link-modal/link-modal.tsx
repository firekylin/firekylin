import * as React from 'react';
import { Form, FormInstance, Input, Modal, Tabs, Select, ModalProps } from 'antd';
const { Option } = Select;

interface EditorLinkModalProps extends ModalProps {
    onCreate: (formRef: React.RefObject<FormInstance>) => void;
    onCancel: () => void;
    fetchData: (keyword: string) => void;
    innerLinks: any[];
    onFormReady?: (formRef: React.RefObject<FormInstance>) => void;
}

class EditorLinkModalForm extends React.Component<EditorLinkModalProps, any> {
    formRef = React.createRef<FormInstance>();

    componentDidMount() {
        this.props.onFormReady?.(this.formRef);
    }

    handleChange = value => {
        const selectedLink = this.props.innerLinks.filter(
            link => link.title === value,
        )[0];
        const pathname = selectedLink.pathname;
        const title = selectedLink.title;
        this.formRef.current?.setFieldsValue({
            innerLinkUrl: pathname,
            innerLinkText: title,
        });
    }

    render() {
        const { onCancel, onCreate, innerLinks } = this.props;
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
                onOk={() => onCreate(this.formRef)}
                onCancel={onCancel}
            >
                <Tabs
                    className="tabs"
                    defaultActiveKey="0"
                    type="card"
                    style={{ padding: 20 }}
                    items={[
                        {
                            key: '0',
                            label: '插入外链',
                            children: (
                                <Form ref={this.formRef}>
                                    <Form.Item {...formItemLayout} label="链接文本：" name="linkText">
                                        <Input />
                                    </Form.Item>
                                    <Form.Item {...formItemLayout} label="链接地址：" name="linkUrl">
                                        <Input />
                                    </Form.Item>
                                </Form>
                            ),
                        },
                        {
                            key: '1',
                            label: '插入内链',
                            children: (
                                <Form>
                                    <Form.Item {...formItemLayout} label="链接文本：" name="innerLinkText">
                                        <Select
                                            showSearch={true}
                                            placeholder="请输入文章标题"
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
                                        </Select>
                                    </Form.Item>
                                    <Form.Item {...formItemLayout} label="链接地址：" name="innerLinkUrl">
                                        <Input />
                                    </Form.Item>
                                </Form>
                            ),
                        },
                    ]}
                />
            </Modal>
        );
    }
}

export default EditorLinkModalForm;
