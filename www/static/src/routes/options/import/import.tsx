import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { Tabs, Form, Button, Radio, Upload, Icon, message } from 'antd';
import BreadCrumb from '../../../components/breadcrumb';
import { OptionsImportProps, OptionsImportState } from './import.model';
const TabPane = Tabs.TabPane;
const FormItem = Form.Item;
import './import.less';
import RadioGroup from 'antd/lib/radio/group';
import { ImportBlogsEnum, ImportUploadAcceptEnum } from './import.enum';
import { RcFile } from 'antd/lib/upload/interface';
import { http } from '../../../utils/http';
import OptionsImportRss from './import-rss/import-rss';
@inject('sharedStore')
@observer 
class OptionsImportForm extends React.Component<OptionsImportProps, OptionsImportState> {
    state = {
        uploading: false,
        fileList: [],
        uploadType: ImportBlogsEnum.WordPress,
    };

    uploadInput = {
        [ImportBlogsEnum.WordPress]: <p style={{marginBottom: 0}}>请上传 WordPress 中导出的 .xml 文件</p>,
        [ImportBlogsEnum.Ghost]: <p>请上传 Ghost 中导出的 .json 文件，Jekyll用户请上传使用 <a href="https://github.com/redwallhp/Jekyll-to-Ghost">Jekyll to Ghost 插件</a>导出后的 .json 文件</p>,
        [ImportBlogsEnum.Hexo]: <p>请上传使用 <a href="https://github.com/lizheming/hexo-generator-hexo2firekylin">Hexo2Firekylin 插件</a> 导出后的 .json 文件</p>,
        [ImportBlogsEnum.MarkDown]: <p>请将所有 Markdown 文件直接打包成 tar.gz 文件上传</p>
    };

    constructor(props: any) {
        super(props);
    }
    componentDidMount() {
        // 
    }

    beforeUpload(file: RcFile) {
        this.setState({fileList: [file]}, () => console.log(this.state.fileList));
        this.forceUpdate();
        return false;
    }

    handleUpload() {
        const { fileList } = this.state;
        const formData = new FormData();
        fileList.forEach((file) => {
            formData.append('file', file);
            formData.append('importor', this.state.uploadType);
        });
    
        this.setState({uploading: true});

        http.upload(formData)
        .then(
            res => {
                this.setState({uploading: false});
                if (res.errno === 0) {
                    message.success('更新成功');
                } else {
                    message.error(typeof res.errmsg === 'string' ? res.errmsg : '上传失败');
                }
            },
            err => {
                console.log(err);
                this.setState({uploading: false});
                message.error('上传失败');
            }
        );
    }

    getUploadAccept(): string {
        switch (this.state.uploadType) {
            case ImportBlogsEnum.WordPress:
                return ImportUploadAcceptEnum.WordPress;
            case ImportBlogsEnum.Ghost:
                return ImportUploadAcceptEnum.Ghost;
            case ImportBlogsEnum.Hexo:
                return ImportUploadAcceptEnum.Hexo;
            case ImportBlogsEnum.MarkDown:
                return ImportUploadAcceptEnum.MarkDown;
            default: 
                return ImportUploadAcceptEnum.WordPress;
        }
    }

    render() {
        const { getFieldDecorator } = this.props.form;
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="page-list option-import-page">
                    <Tabs className="tabs" 
                        defaultActiveKey="0" 
                        type="card" 
                    >
                        <TabPane tab="普通导入" key="0">
                            <Form>
                                <FormItem
                                    label="请选择导入的博客平台"
                                >
                                    {getFieldDecorator('blog', {
                                        initialValue: this.state.uploadType || ImportBlogsEnum.WordPress,
                                    })(
                                        <RadioGroup
                                            onChange={e => {
                                                this.setState({uploadType: e.target.value, fileList: []});
                                            }}
                                        >
                                            <Radio value={ImportBlogsEnum.WordPress}>WordPress</Radio>
                                            <Radio value={ImportBlogsEnum.Ghost}>Ghost / Jekyll</Radio>
                                            <Radio value={ImportBlogsEnum.Hexo}>Hexo</Radio>
                                            <Radio value={ImportBlogsEnum.MarkDown}>Markdown文件</Radio>
                                        </RadioGroup>
                                    )}
                                </FormItem>
                                <FormItem
                                >
                                    {this.uploadInput[this.state.uploadType]}
                                    <Upload 
                                        name="file"
                                        action="/admin/api/file"
                                        accept={this.getUploadAccept()}
                                        fileList={this.state.fileList}
                                        beforeUpload={file => this.beforeUpload(file)}
                                    >
                                        <Button>
                                            <Icon type="upload" /> 选择文件
                                        </Button>
                                    </Upload>
                                </FormItem>
                                <FormItem>
                                    <Button
                                        className="upload-demo-start"
                                        type="primary"
                                        onClick={() => this.handleUpload()}
                                        disabled={this.state.fileList.length === 0}
                                        loading={this.state.uploading}
                                    >
                                        {this.state.uploading ? '上传中...' : '上传'}
                                    </Button>
                                </FormItem>
                            </Form>
                        </TabPane>
                        <TabPane tab="RSS导入" key="1">
                            <OptionsImportRss />
                        </TabPane>
                    </Tabs>
                </div>
            </>
        );
    }
}
const OptionsImport = Form.create()(OptionsImportForm);
export default OptionsImport;
