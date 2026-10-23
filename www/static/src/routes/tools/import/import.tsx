import * as React from 'react';
import { observer, inject } from '@admin/utils/mobx-react';
import { UploadOutlined } from '@ant-design/icons';
import { Form } from 'antd';
import { Tabs, Button, Radio, Upload, message } from 'antd';
import BreadCrumb from '../../../components/breadcrumb';
import { OptionsImportProps, OptionsImportState } from './import.model';
const TabPane = Tabs.TabPane;
import './import.less';
const RadioGroup = Radio.Group;
import { ImportBlogsEnum, ImportUploadAcceptEnum } from './import.enum';
import type { RcFile } from 'antd/es/upload/interface';
import { http } from '../../../utils/http';
import OptionsImportRss from './import-rss/import-rss';
function OptionsImportForm(props: OptionsImportProps) {
    const [state, setState] = React.useState(() => ({
        uploading: false,
        fileList: [],
        uploadType: ImportBlogsEnum.WordPress,
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
        legacy.uploadInput = {
            [ImportBlogsEnum.WordPress]: (
                <p style={{ marginBottom: 0 }}>请上传 WordPress 中导出的 .xml 文件</p>
            ),
            [ImportBlogsEnum.Ghost]: (
                <p>
                    请上传 Ghost 中导出的 .json 文件，Jekyll用户请上传使用{' '}
                    <a href="https://github.com/redwallhp/Jekyll-to-Ghost">
                        Jekyll to Ghost 插件
                    </a>
                    导出后的 .json 文件
                </p>
            ),
            [ImportBlogsEnum.Hexo]: (
                <p>
                    请上传使用{' '}
                    <a href="https://github.com/lizheming/hexo-generator-hexo2firekylin">
                        Hexo2Firekylin 插件
                    </a>{' '}
                    导出后的 .json 文件
                </p>
            ),
            [ImportBlogsEnum.Hugo]: (
                <p>请将 Hugo 站点的 content 目录打包成 .zip、.tar.gz 或 .tgz 文件上传</p>
            ),
            [ImportBlogsEnum.MarkDown]: (
                <p>请将所有 Markdown 文件直接打包成 tar.gz 文件上传</p>
            ),
        };
    }
    legacy.onMount = function onMount() {
        //
    };
    legacy.beforeUpload = function beforeUpload(file: RcFile) {
        legacy.setState({ fileList: [file] });
        return false;
    };
    legacy.handleUpload = function handleUpload() {
        const { fileList } = legacy.state;
        const formData = new FormData();
        fileList.forEach((file) => {
            formData.append('file', file);
            formData.append('importor', legacy.state.uploadType);
        });

        legacy.setState({ uploading: true });

        http.upload(formData).then(
            (res) => {
                legacy.setState({ uploading: false });
                if (res.errno === 0) {
                    message.success('更新成功');
                } else {
                    message.error(
                        typeof res.errmsg === 'string' ? res.errmsg : '上传失败',
                    );
                }
            },
            (err) => {
                console.log(err);
                legacy.setState({ uploading: false });
                message.error('上传失败');
            },
        );
    };
    legacy.getUploadAccept = function getUploadAccept(): string {
        switch (legacy.state.uploadType) {
            case ImportBlogsEnum.WordPress:
                return ImportUploadAcceptEnum.WordPress;
            case ImportBlogsEnum.Ghost:
                return ImportUploadAcceptEnum.Ghost;
            case ImportBlogsEnum.Hexo:
                return ImportUploadAcceptEnum.Hexo;
            case ImportBlogsEnum.Hugo:
                return ImportUploadAcceptEnum.Hugo;
            case ImportBlogsEnum.MarkDown:
                return ImportUploadAcceptEnum.MarkDown;
            default:
                return ImportUploadAcceptEnum.WordPress;
        }
    };
    legacy.render = function render() {
        return (
            <>
                <BreadCrumb className="breadcrumb" {...props} />
                <div className="page-list option-import-page">
                    <Tabs className="tabs" defaultActiveKey="0" type="card">
                        <TabPane tab="普通导入" key="0">
                            <Form layout="vertical">
                                <Form.Item
                                    label="请选择导入的博客平台"
                                    name="blog"
                                    initialValue={
                                        legacy.state.uploadType ||
                                        ImportBlogsEnum.WordPress
                                    }
                                >
                                    <RadioGroup
                                        onChange={(e) => {
                                            legacy.setState({
                                                uploadType: e.target.value,
                                                fileList: [],
                                            });
                                        }}
                                    >
                                        <Radio value={ImportBlogsEnum.WordPress}>
                                            WordPress
                                        </Radio>
                                        <Radio value={ImportBlogsEnum.Ghost}>
                                            Ghost / Jekyll
                                        </Radio>
                                        <Radio value={ImportBlogsEnum.Hexo}>Hexo</Radio>
                                        <Radio value={ImportBlogsEnum.Hugo}>Hugo</Radio>
                                        <Radio value={ImportBlogsEnum.MarkDown}>
                                            Markdown文件
                                        </Radio>
                                    </RadioGroup>
                                </Form.Item>
                                <Form.Item>
                                    {legacy.uploadInput[legacy.state.uploadType]}
                                    <Upload
                                        name="file"
                                        action="/admin/api/file"
                                        accept={legacy.getUploadAccept()}
                                        fileList={legacy.state.fileList}
                                        beforeUpload={(file) =>
                                            legacy.beforeUpload(file)
                                        }
                                    >
                                        <Button>
                                            <UploadOutlined /> 选择文件
                                        </Button>
                                    </Upload>
                                </Form.Item>
                                <Form.Item>
                                    <Button
                                        type="primary"
                                        onClick={() => legacy.handleUpload()}
                                        disabled={legacy.state.fileList.length === 0}
                                        loading={legacy.state.uploading}
                                    >
                                        {legacy.state.uploading ? '上传中...' : '上传'}
                                    </Button>
                                </Form.Item>
                            </Form>
                        </TabPane>
                        <TabPane tab="RSS导入" key="1">
                            <OptionsImportRss />
                        </TabPane>
                    </Tabs>
                </div>
            </>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    return legacy.render();
}

export default inject('sharedStore')(observer(OptionsImportForm));
