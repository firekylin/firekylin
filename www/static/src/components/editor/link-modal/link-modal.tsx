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
function EditorLinkModalForm(props: EditorLinkModalProps) {
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
    if (!legacy.__initialized) {
        legacy.__initialized = true;
        legacy.formRef = React.createRef<FormInstance>();
        legacy.handleChange = (value) => {
            const selectedLink = props.innerLinks.filter(
                (link) => link.title === value,
            )[0];
            const pathname = selectedLink.pathname;
            const title = selectedLink.title;
            legacy.formRef.current?.setFieldsValue({
                innerLinkUrl: pathname,
                innerLinkText: title,
            });
        };
    }
    legacy.onMount = function onMount() {
        props.onFormReady?.(legacy.formRef);
    };
    legacy.render = function render() {
        const { onCancel, onCreate, innerLinks } = props;
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
                open={props.open}
                onOk={() => onCreate(legacy.formRef)}
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
                                <Form ref={legacy.formRef}>
                                    <Form.Item
                                        {...formItemLayout}
                                        label="链接文本："
                                        name="linkText"
                                    >
                                        <Input />
                                    </Form.Item>
                                    <Form.Item
                                        {...formItemLayout}
                                        label="链接地址："
                                        name="linkUrl"
                                    >
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
                                    <Form.Item
                                        {...formItemLayout}
                                        label="链接文本："
                                        name="innerLinkText"
                                    >
                                        <Select
                                            showSearch={true}
                                            placeholder="请输入文章标题"
                                            defaultActiveFirstOption={false}
                                            showArrow={false}
                                            filterOption={false}
                                            onSearch={props.fetchData}
                                            onChange={legacy.handleChange}
                                            notFoundContent="未找到文章"
                                        >
                                            {innerLinks.map((d: any) => (
                                                <Option key={d.id} value={d.title}>
                                                    {d.title}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                    <Form.Item
                                        {...formItemLayout}
                                        label="链接地址："
                                        name="innerLinkUrl"
                                    >
                                        <Input />
                                    </Form.Item>
                                </Form>
                            ),
                        },
                    ]}
                />
            </Modal>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    return legacy.render();
}

export default EditorLinkModalForm;
