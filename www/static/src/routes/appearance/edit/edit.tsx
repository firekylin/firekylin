import  React from 'react';
import { observer, inject } from 'mobx-react';
import BreadCrumb from '../../../components/breadcrumb';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/mode/css/css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/htmlmixed/htmlmixed';
import { Tree, Modal, Button, message } from 'antd';
import { ThemeEditProps } from './edit.modal';
import { AntTreeNode } from 'antd/lib/tree';
const confirm = Modal.confirm;
const TreeNode = Tree.TreeNode;

@inject('editStore', 'sharedStore')
@observer class Edit extends React.Component<ThemeEditProps, {}> {
    state = {
        theme: '',
        content: '',
        currentFile: '',

    };
    getEditorMode(ext: any) {
        switch (ext.toLowerCase()) {
            case 'json':
            case 'js':
                return 'javascript';
            case 'css':
                return 'css';
            case 'html':
                default:
                return 'htmlmixed';
        }
    }
    componentDidMount() {
        const { editStore } = this.props;
        this.checkTheme();
        editStore.getThemeFileList()
        .subscribe(
            res => {
                const themeFileList = [{module: editStore.data.theme, children: res.data}];
                editStore.setData({themeFileList: editStore.addNodesProps(themeFileList)});
                this.initializeTree();
            }
        );
    }

    initializeTree() {
        const { themeFileList } = this.props.editStore.data;
        this.props.editStore.setData({expandedKeys: ['0']});
        const selectedKey: string = ((themeFileList[0] as any).children as any).filter((item: any) => item.module === 'package.json')[0].key;
        this.props.editStore.setData({selectedKeys: [selectedKey]});
        this.selectFile(selectedKey);
    }

    checkTheme() {
        if (this.props.editStore.data.theme !== 'firekylin') {
          return;
        }
        confirm({
            title: '主题修改警告！',
            content: '您当前使用的是默认主题，升级过程中很有可能会覆盖你的修改，是否需要拷贝默认主题为新的主题来避免这个问题？',
            onOk: () => {
                this.props.editStore.forkTheme('firekylin', 'firekylin_new')
                .subscribe(
                    res => {
                        if (res.errno === 0) {
                            message.success('拷贝主题成功，你可以放心修改了！');
                        }
                    }
                );
            }
        });
    }
    // 处理Select响应
    onSelect(node: AntTreeNode) {
        if (node.props.children) {
            return;
        }
        this.selectFile((node.props.eventKey as string));
    }
    // 选择文件
    selectFile(key: string) {
        const path = this.props.editStore.getNodePathByKey(key);
        if (!path) {
            return;
        }
        this.props.editStore.getThemeFileByPath(path);
    }

    // 保存
    handleSave() {
        const { path, themeContent } = this.props.editStore.data;
        if (!path) {
            return;
        }
        this.props.editStore.themeFileUpdate(path, themeContent);
    }

    renderTreeNodes = (data) => {
        return data.map((item, i) => {
            if (item.children) {
                return (
                    <TreeNode title={item.module} key={item.key}>
                        {this.renderTreeNodes(item.children)}
                    </TreeNode>
                );
            }
            return <TreeNode title={item.module} key={item.key} />;
        });
    }

    render() {
        const { editStore } = this.props;
        const { themeFileList, theme, themeContent, path, expandedKeys, selectedKeys } = this.props.editStore.data;
        return (
            <div className="edit">
                <BreadCrumb {...this.props} />
                <div className="page-list">
                    <h3 style={{marginBottom: '20px'}}>编辑当前主题({theme})</h3>
                    <div className="row">
                        <div className="col-xs-9 theme-editor">
                            <CodeMirror
                                options={{
                                    theme: 'monokai',
                                    lineNumbers: true,
                                    mode: this.getEditorMode(path.split('.').pop())
                                }}
                                value={themeContent}
                                onBeforeChange={(editor, data, content) => {
                                    editStore.setData({themeContent: content});
                                }}
                            />
                            <div className="text-right" style={{marginTop: 15}}>
                                <Button type="primary" onClick={() => this.handleSave()}>保存</Button>
                            </div>
                        </div>
                        <div className="col-xs-3">
                            <Tree
                                expandedKeys={expandedKeys}
                                selectedKeys={selectedKeys}
                                onSelect={keys => editStore.setData({selectedKeys: keys})}
                                onExpand={(keys) => editStore.setData({expandedKeys: keys})}
                                onClick={(e, node) => this.onSelect(node)}
                            >
                                {this.renderTreeNodes(themeFileList)}
                            </Tree>
                        </div>
                    </div>
                    </div>
            </div>
        );
    }
}
export default Edit;
