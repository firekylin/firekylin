import React from 'react';
import { observer, inject } from '@admin/utils/mobx-react';
import BreadCrumb from '../../../components/breadcrumb';
import { Tree, Modal, Button, message } from 'antd';
import { ThemeEditProps } from './edit.modal';
import CodeEditor from './code-editor';
const info = Modal.info;
function Edit(props: ThemeEditProps) {
    const [state, setState] = React.useState(() => ({
        theme: '',
        content: '',
        currentFile: '',
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
        legacy.onSelect = (selectedKeys: any, { node }: any) => {
            if (node.children) {
                return;
            }
            legacy.selectFile(node.key as string);
        };
    }
    legacy.onMount = function onMount() {
        const { editStore } = props;
        legacy.checkTheme();
        editStore.getThemeFileList().subscribe((res) => {
            const themeFileList = [{ module: editStore.data.theme, children: res.data }];
            editStore.setData({ themeFileList: editStore.addNodesProps(themeFileList) });
            legacy.initializeTree();
        });
    };
    legacy.initializeTree = function initializeTree() {
        const { themeFileList } = props.editStore.data;
        props.editStore.setData({ expandedKeys: ['0'] });
        const selectedKey: string = ((themeFileList[0] as any).children as any).filter(
            (item: any) => item.module === 'package.json',
        )[0].key;
        props.editStore.setData({ selectedKeys: [selectedKey] });
        legacy.selectFile(selectedKey);
    };
    legacy.checkTheme = function checkTheme() {
        if (props.editStore.data.theme !== 'firekylin') {
            return;
        }
        info({
            title: '主题修改警告！',
            content:
                '你当前使用的是默认主题，升级过程中很有可能会覆盖你的修改，如需修改请自行拷贝默认主题为新的主题来避免这个问题。',
        });
    };
    legacy.selectFile = function selectFile(key: string) {
        const path = props.editStore.getNodePathByKey(key);
        if (!path) {
            return;
        }
        props.editStore.getThemeFileByPath(path);
    };
    legacy.handleSave = function handleSave() {
        const { path, themeContent } = props.editStore.data;
        if (!path) {
            return;
        }
        props.editStore.themeFileUpdate(path, themeContent);
    };
    legacy.render = function render() {
        const { editStore } = props;
        const { themeFileList, theme, themeContent, path, expandedKeys, selectedKeys } =
            props.editStore.data;
        return (
            <div className="edit">
                <BreadCrumb {...props} />
                <div className="page-list">
                    <h3 style={{ marginBottom: '20px' }}>编辑当前主题({theme})</h3>
                    <div className="row">
                        <div className="col-xs-9 theme-editor">
                            <CodeEditor
                                path={path}
                                value={themeContent}
                                onChange={(content) => {
                                    editStore.setData({ themeContent: content });
                                }}
                            />

                            <div className="text-right" style={{ marginTop: 15 }}>
                                <Button
                                    type="primary"
                                    onClick={() => legacy.handleSave()}
                                >
                                    保存
                                </Button>
                            </div>
                        </div>
                        <div className="col-xs-3">
                            <Tree
                                treeData={themeFileList}
                                fieldNames={{
                                    title: 'module',
                                    key: 'key',
                                    children: 'children',
                                }}
                                expandedKeys={expandedKeys}
                                selectedKeys={selectedKeys}
                                onSelect={(keys, info) => {
                                    editStore.setData({ selectedKeys: keys });
                                    legacy.onSelect(keys, info);
                                }}
                                onExpand={(keys) =>
                                    editStore.setData({ expandedKeys: keys })
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    return legacy.render();
}

export default inject('editStore', 'sharedStore')(observer(Edit));
