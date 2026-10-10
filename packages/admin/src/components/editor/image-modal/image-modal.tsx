import React from 'react';
import { Input, Modal, Tabs, Upload, message, UploadChangeParam, ModalProps } from 'antd';
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

class EditorImageModalForm extends React.Component<EditorImageModalProps, {loading: boolean}> {
    state = {
        loading: false,
    };

    getBase64(img: any, callback: Function) {
        const reader = new FileReader();
        reader.addEventListener('load', () => callback(reader.result));
        reader.readAsDataURL(img);
    }

    handleChange = (info: UploadChangeParam) => {
        if (info.file.status === 'uploading') {
          this.setState({ loading: true });
          return;
        }
        if (info.file.status === 'done') {
          this.props.fileDone(info);
          this.setState({loading: false});
        }
    }

    beforeUpload(file: File) {
        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('图片必须小于5MB!');
        }
        return isLt5M;
    }

    render() {
        const { onCancel, fileLink } = this.props;
        const imageUrl = this.props.imageUrl;
        const uploadButton = (
            <div>
              {this.state.loading ? <LoadingOutlined /> : <PlusOutlined />}
              <div className="ant-upload-text">Upload</div>
            </div>
        );
        return (
            <Modal
                title="插入图片"
                visible={this.props.visible}
                onOk={this.props.onOk}
                onCancel={onCancel}
                className="eidtor-image-modal"
            >
                <Tabs className="tabs"
                    defaultActiveKey="0"
                    type="card"
                    onChange={key => {this.props.tabChanged(key); }}
                    activeKey={this.props.tabKey}
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
                                    style={{width: 100, height: 100}}
                                    action="/admin/api/file"
                                    beforeUpload={this.beforeUpload}
                                    onChange={this.handleChange}
                                >
                                    {imageUrl ? <img src={imageUrl} alt="avatar" /> : uploadButton}
                                </Upload>
                            ),
                        },
                        {
                            key: '1',
                            label: '从网络上抓取',
                            children: (
                                <div style={{ padding: 20 }}>
                                    <div style={{ marginBottom: 8 }}>链接地址：</div>
                                    <Input value={fileLink} onChange={(e: ChangeEvent<HTMLInputElement>) => this.props.fileLinkChange(e.target.value)} />
                                </div>
                            ),
                        },
                    ]}
                />
            </Modal>
        );
    }
}

export default EditorImageModalForm;
