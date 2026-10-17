import React from 'react';
import { Input, Modal, Tabs, Upload, message, ModalProps } from 'antd';
import type { UploadChangeParam } from 'antd/es/upload/interface';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { ChangeEvent } from 'react';
import './image-modal.less';

interface EditorImageModalProps extends ModalProps {
    imageUrl: string;
    fileLink: string;
    tabKey: string;
    onOk: (e: any, ...params: any[]) => void;
    onCancel: () => void;
    fileDone: (info: UploadChangeParam) => void;
    fileLinkChange: (fileLink: string) => void;
    tabChanged: (key: string) => void;
}
function EditorImageModalForm(props: EditorImageModalProps) {
    const [state, setState] = React.useState(() => ({
        loading: false,
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
        legacy.handleChange = (info: UploadChangeParam) => {
            if (info.file.status === 'uploading') {
                legacy.setState({ loading: true });
                return;
            }
            if (info.file.status === 'done') {
                props.fileDone(info);
                legacy.setState({ loading: false });
            }
        };
    }
    legacy.getBase64 = function getBase64(img: any, callback: Function) {
        const reader = new FileReader();
        reader.addEventListener('load', () => callback(reader.result));
        reader.readAsDataURL(img);
    };
    legacy.beforeUpload = function beforeUpload(file: File) {
        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('图片必须小于5MB!');
        }
        return isLt5M;
    };
    legacy.render = function render() {
        const { onCancel, fileLink } = props;
        const imageUrl = props.imageUrl;
        const uploadButton = (
            <div>
                {legacy.state.loading ? <LoadingOutlined /> : <PlusOutlined />}
                <div className="ant-upload-text">Upload</div>
            </div>
        );

        return (
            <Modal
                title="插入图片"
                open={props.open}
                onOk={props.onOk}
                onCancel={onCancel}
                className="eidtor-image-modal"
            >
                <Tabs
                    className="tabs"
                    defaultActiveKey="0"
                    type="card"
                    onChange={(key) => {
                        props.tabChanged(key);
                    }}
                    activeKey={props.tabKey}
                    items={[
                        {
                            key: '0',
                            label: '本地上传',
                            children: (
                                <Upload
                                    name="file"
                                    listType="picture-card"
                                    accept=""
                                    className="avatar-uploader"
                                    showUploadList={false}
                                    style={{ width: 100, height: 100 }}
                                    action="/admin/api/file"
                                    beforeUpload={legacy.beforeUpload}
                                    onChange={legacy.handleChange}
                                >
                                    {imageUrl ? (
                                        <img src={imageUrl} alt="avatar" />
                                    ) : (
                                        uploadButton
                                    )}
                                </Upload>
                            ),
                        },
                        {
                            key: '1',
                            label: '从网络上抓取',
                            children: (
                                <div style={{ padding: 20 }}>
                                    <div style={{ marginBottom: 8 }}>链接地址：</div>
                                    <Input
                                        value={fileLink}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                            props.fileLinkChange(e.target.value)
                                        }
                                    />
                                </div>
                            ),
                        },
                    ]}
                />
            </Modal>
        );
    };
    return legacy.render();
}

export default EditorImageModalForm;
