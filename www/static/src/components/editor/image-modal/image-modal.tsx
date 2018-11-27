import React from 'react';
import { Input, Modal, Tabs, Form, Upload, message, Icon } from 'antd';
import { ChangeEvent } from 'react';
import { ModalProps } from 'antd/lib/modal';
import { FormComponentProps } from 'antd/lib/form';
import { UploadChangeParam } from 'antd/lib/upload';
import './image-modal.less';

const TabPane = Tabs.TabPane;
const FormItem = Form.Item;

interface EditorImageModalProps extends ModalProps, FormComponentProps {
    imageUrl: string;
    fileLink: string;
    tabKey: string;
    onOk: (e: any, ...params: any[]) => void;
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
        const formItemLayout = {
            labelCol: {
                xl: { span: 4 },
            },
            wrapperCol: {
                xl: { span: 20 },
            },
        };
        const imageUrl = this.props.imageUrl;
        const uploadButton = (
            <div>
              <Icon type={this.state.loading ? 'loading' : 'plus'} />
              <div className="ant-upload-text">Upload</div>
            </div>
        );
        return (
            <Modal
                title="插入图片"
                visible={this.props.visible}
                // onOk={(e) => this.props.onOk(e, this.state)}
                onOk={this.props.onOk}
                onCancel={onCancel}
                className="eidtor-image-modal"
            >
                <Tabs className="tabs" 
                    defaultActiveKey="0"
                    type="card" 
                    onChange={key => {this.props.tabChanged(key); }}
                    activeKey={this.props.tabKey}
                >
                    <TabPane tab="本地上传" key="0">
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
                    </TabPane>
                    <TabPane tab="从网络上抓取" key="1">
                        <Form>
                            <FormItem
                                {...formItemLayout}
                                label="链接地址："
                            >
                                <Input value={fileLink} onChange={(e: ChangeEvent<HTMLInputElement>) => this.props.fileLinkChange(e.target.value)} />
                            </FormItem>
                        </Form>
                    </TabPane>
                </Tabs>
            </Modal>
        );
    }
}

const EditorImageModal = Form.create()(EditorImageModalForm);

export default EditorImageModal;
