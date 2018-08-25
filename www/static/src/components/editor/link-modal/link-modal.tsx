import * as React from 'react';
import { Input, Modal, Tabs, Form } from 'antd';
import { ModalProps } from 'antd/lib/modal';
const TabPane = Tabs.TabPane;
const FormItem = Form.Item;

class EditorLinkModal extends React.Component<ModalProps, {}> {

    constructor(props: any) {
        super(props);
    }

    render() {
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
                onOk={this.props.onOk}
                // onCancel={() => this.setState({visible: Object.assign({}, this.state.visible, {link: false})})}
                onCancel={this.props.onCancel}
            >
                <Tabs className="tabs" 
                    defaultActiveKey="" 
                    type="card" 
                >
                    <TabPane tab="插入内链" key="">
                    <Form onSubmit={() => {console.log('hi'); }}>
                            <FormItem
                                {...formItemLayout}
                                label="链接地址："
                            >
                                <Input />
                            </FormItem>
                            <FormItem
                                {...formItemLayout}
                                label="链接文本："
                            >
                                <Input />
                            </FormItem>
                        </Form>
                    </TabPane>
                    <TabPane tab="插入外链" key="3">
                        {/*  */}
                    </TabPane>
                </Tabs>
            </Modal>
        );
    }
}

export default EditorLinkModal;
