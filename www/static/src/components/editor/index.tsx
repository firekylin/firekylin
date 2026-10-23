/**
 * 本项目的编辑器是由 https://github.com/leozdgao/react-markdown 该项目修改而来，感谢作者的无私奉献！
 */
import { AIToolbar } from '../article/ai-editor';
import classnames from 'classnames';
import * as React from 'react';

// import Search from './search';
import './style.less';
import * as icons from './icons';
import { Modal, message, FormInstance, Dropdown } from 'antd';
import type { UploadChangeParam } from 'antd/es/upload/interface';
import EditorLinkModal from './link-modal/link-modal';
import EditorImageModal from './image-modal/image-modal';
import { http } from '../../utils/http';
const confirm = Modal.confirm;

interface MdEditorProps {
    onFullScreen: (isFullScreen: any) => void;
    content: string;
    children?: Node;
    info: any;
    onChange: any;
    innerLinks: any[];
    fetchData: (e: any) => void;
}
const createEditorState = () => ({
    panelClass: 'md-panel',
    mode: 'split',
    isFullScreen: false,
    isMonospace: true,
    result: '',
    linkUrl: '',
    linkText: '',
    content: null,
    fileUrl: '',
    file: [],
    visible: {link: false, image: false},
    imageUrl: '',
    fileLink: '',
    imageTabKey: '0',
});
function MarkDownEditor(props: MdEditorProps) {
    const [state, setState] = React.useState(createEditorState);
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
        legacy._previewRequest = 0;
        legacy.linkFormRef = React.createRef<FormInstance>();
    }
    legacy.initialState = function initialState() {
        return {
            panelClass: 'md-panel',
            mode: 'split',
            isFullScreen: false,
            isMonospace: true,
            result: '',
            linkUrl: '',
            linkText: '',
            content: null,
            fileUrl: '',
            file: [],
            visible: {
                link: false,
                image: false,
            },
            imageUrl: '',
            fileLink: '',
            imageTabKey: '0',
        };
    };
    legacy.onMount = function onMount() {
        // cache dom node
        legacy.previewControl = legacy.preview;
        legacy._syncScroll = (() => {
            let leftSync = false,
                rightSync = false;
            let that = legacy;

            return function (e: any) {
                let scrollEle = e.target;
                let syncEle =
                    scrollEle === that.textControl
                        ? that.previewControl
                        : that.textControl;
                let percent =
                    scrollEle.scrollTop /
                    (scrollEle.scrollHeight - scrollEle.clientHeight);
                if (leftSync && scrollEle === that.previewControl) {
                    return true;
                }
                if (rightSync && scrollEle === that.textControl) {
                    return true;
                }

                leftSync = scrollEle === that.textControl;
                rightSync = scrollEle === that.previewControl;
                syncEle.scrollTop =
                    percent * (syncEle.scrollHeight - syncEle.clientHeight);

                setTimeout(() => (leftSync = rightSync = false), 100);
            };
        })();

        if (localStorage['unsavetype' + props.info.type + 'id' + props.info.id + '']) {
            confirm({
                title: '提示',
                content: '检测到上次没有保存文章就退出页面，是否从缓存里恢复文章?',
                onOk: () => {
                    let content =
                        localStorage[
                            'unsavetype' + props.info.type + 'id' + props.info.id
                        ];
                    legacy._renderPreview(content);
                    props.onChange(content);
                },
                onCancel: () => {
                    localStorage.removeItem(
                        'unsavetype' + props.info.type + 'id' + props.info.id,
                    );
                },
            });
        }
        (legacy.textControl as HTMLTextAreaElement).addEventListener('keydown', (e) =>
            legacy._bindKey(e),
        );
        (legacy.textControl as HTMLTextAreaElement).addEventListener('paste', (e) =>
            legacy._bindPaste(e),
        );
        (legacy.textControl as HTMLTextAreaElement).addEventListener(
            'scroll',
            (e) => legacy._syncScroll(e),
            false,
        );
        legacy.previewControl.addEventListener('scroll', legacy._syncScroll, false);
        legacy._bindMouse();
        legacy._renderPreview(props.content);
    };
    legacy._bindPaste = function _bindPaste(e: ClipboardEvent) {
        let clipboard = e.clipboardData;
        let FileList = Array.from(clipboard.items)
            .filter(
                (item: any) => item.kind === 'file' && item.type.indexOf('image') > -1,
            )
            .map((item: any) => item.getAsFile());
        if (!FileList.length) {
            return true;
        }

        e.preventDefault();
        let data = new FormData();
        data.append('file', FileList[0]);
        legacy.upLoadImage(data, FileList[0].name);
    };
    legacy._bindMouse = function _bindMouse() {
        const panel = legacy.editorPanel;
        const resizebar = legacy.resizebar;

        (resizebar as HTMLAnchorElement).addEventListener(
            'mousedown',
            function resizeStart(e: MouseEvent) {
                e.preventDefault();

                const start = e.pageY,
                    oHeight = (panel as HTMLElement).clientHeight;
                // tslint:disable-next-line:no-shadowed-variable
                const resize = (e) => {
                    e.preventDefault();
                    (panel as HTMLElement).style.height =
                        oHeight + e.pageY - start + 'px';
                };

                window.addEventListener('mousemove', resize);
                window.addEventListener('mouseup', () => {
                    window.removeEventListener('mousemove', resize);
                });
            },
        );
    };
    legacy._getKeyCode = function _getKeyCode(e: KeyboardEvent): string {
        if (e.code.startsWith('Digit')) return e.code.slice(5);
        if (e.code.startsWith('Key')) return e.code.slice(3);
        return '';
    };
    legacy._bindKey = function _bindKey(e: KeyboardEvent) {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                legacy._handleShiftTab();
            } else {
                legacy._handleTab();
            }
            e.preventDefault();
            return;
        }

        if (e.key === 'Enter') {
            if (legacy._handleEnter()) {
                e.preventDefault();
            }
            return;
        }

        let ctrlShortcuts = {
            B: legacy._boldText,
            I: legacy._italicText,
            K: legacy._quickLinkText,
            L: legacy._linkModal,
            Q: legacy._blockquoteText,
            E: legacy._inlineCodeText,
            G: legacy._pictureText,
            H: legacy._headerText,
            M: legacy._inlineFormulaText,
            R: legacy._insertHr,
        };

        let ctrlShiftShortcuts = {
            E: legacy._codeText,
            M: legacy._formulaText,
            '7': legacy._listOlText,
            '8': legacy._listUlText,
        };

        if (!e.metaKey && !e.ctrlKey) {
            return;
        }

        let key = legacy._getKeyCode(e);
        let handler = e.shiftKey ? ctrlShiftShortcuts[key] : ctrlShortcuts[key];
        if (handler) {
            handler.bind(null)();
            e.preventDefault();
        }
    };
    legacy.onPropsChange = function onPropsChange(
        previousProps: any,
    ) {
        if (previousProps.content === props.content) {
            return;
        }
        legacy._schedulePreview(props.content, props.info.type);
    };
    legacy.onUnmount = function onUnmount() {
        clearTimeout(legacy._ltr);
        legacy._previewRequest++;
        if (legacy._previewSubscription) legacy._previewSubscription.unsubscribe();
        legacy.textControl = null;
        legacy.previewControl = null;
    };
    legacy._renderPreview = function _renderPreview(
        content: string,
        type = props.info.type,
    ) {
        const request = ++legacy._previewRequest;
        if (legacy._previewSubscription) legacy._previewSubscription.unsubscribe();
        legacy._previewSubscription = http
            .post<{ html: string }>('/admin/api/markdown', {
                markdown_content: content,
                type,
            })
            .subscribe((res) => {
                if (request === legacy._previewRequest && res.errno === 0 && res.data) {
                    legacy.setState({ result: res.data.html });
                }
            });
    };
    legacy._schedulePreview = function _schedulePreview(
        content: string,
        type = props.info.type,
    ) {
        clearTimeout(legacy._ltr);
        legacy._ltr = setTimeout(() => legacy._renderPreview(content, type), 300);
    };
    legacy.handleLinkCreate = function handleLinkCreate() {
        legacy.linkFormRef.current
            ?.validateFields()
            .then((values) => {
                legacy.setState({ linkText: values.linkText, linkUrl: values.linkUrl });

                if (values.innerLinkUrl || values.innerLinkText) {
                    values.linkUrl = `${location.origin}/post/${values.innerLinkUrl}.html`;
                    values.linkText = values.innerLinkText;
                }

                const hasUrl = !!values.linkUrl;
                const hasText = !!values.linkText;

                if (hasUrl && hasText) {
                    // 都输入了：光标到末尾
                    legacy._modalLinkText(values.linkText, values.linkUrl, 'end');
                } else if (hasText && !hasUrl) {
                    // 有文本没地址：选中url
                    legacy._modalLinkText(values.linkText, 'www.yourlink.com', 'url');
                } else if (hasUrl && !hasText) {
                    // 有地址没文本：选中text
                    legacy._modalLinkText('链接文本', values.linkUrl, 'text');
                } else {
                    // 都没输入：选中text
                    legacy._modalLinkText('链接文本', 'www.yourlink.com', 'text');
                }

                legacy.linkFormRef.current?.resetFields();
                legacy.setState({
                    visible: Object.assign({}, legacy.state.visible, { link: false }),
                });
            })
            .catch(() => {
                // validation failed, do nothing
            });
    };
    legacy.handleImageOk = function handleImageOk() {
        if (!legacy.state.imageUrl && !legacy.state.fileLink) {
            message.warning('请插入图片');
            return;
        }
        const start = legacy._getCursorPos() as number;
        if (legacy.state.imageTabKey === '0') {
            const fileName = legacy.fileInfo.file.name;
            let fileUrl = legacy.imagePath;
            if (!/^(https?:)?\/\/.+/i.test(legacy.imagePath)) {
                fileUrl = location.origin + fileUrl;
            }
            legacy._preInputText(`![${fileName}](${fileUrl})`, 2, fileName.length + 2, {
                position: start,
            });
            legacy.imageModalClose();
        } else {
            if (legacy.state.fileLink) {
                const data = new FormData();
                data.append('fileUrl', legacy.state.fileLink);
                legacy.upLoadImage(data);
            }
        }
    };
    legacy.upLoadImage = function upLoadImage(data: FormData, fileName: string = 'alt') {
        const start = legacy._getCursorPos() as number;
        http.upload(data)
            .then((res) => {
                const reg = /^(https?:)?\/\/.+/i;
                if (!reg.test(res.data)) {
                    res.data = location.origin + res.data;
                }
                const text = legacy.state.fileLink ? '链接文本' : fileName;
                if (text === 'alt') {
                    legacy._preInputText(`![${text}](${res.data})`, 2, 5, {
                        position: start,
                    });
                } else {
                    legacy._preInputText(`![${text}](${res.data})`, 2, text.length + 2, {
                        position: start,
                    });
                }
                legacy.imageModalClose();
            })
            .catch((res) => {
                message.error(res.errmsg);
            });
    };
    legacy.getBase64 = function getBase64(img: any, callback: Function) {
        const reader = new FileReader();
        reader.addEventListener('load', () => callback(reader.result));
        reader.readAsDataURL(img);
    };
    legacy.handleFile = function handleFile(fileInfo: UploadChangeParam) {
        if (fileInfo.file.response.errno !== 0) {
            message.error(fileInfo.file.response.errmsg);
        } else {
            legacy.fileInfo = fileInfo;
            legacy.getBase64(fileInfo.file.originFileObj, (imageUrl) =>
                legacy.setState({
                    imageUrl,
                }),
            );
            legacy.imagePath = fileInfo.file.response.data;
        }
    };
    legacy.handleFileLinkChange = function handleFileLinkChange(fileLink: string) {
        legacy.setState({ fileLink: fileLink });
    };
    legacy.imageModalClose = function imageModalClose() {
        legacy.setState({
            visible: Object.assign({}, legacy.state.visible, { image: false }),
            imageUrl: '',
            imagePath: '',
            fileLink: '',
        });
        legacy.imagePath = '';
    };
    legacy.render = function render() {
        const panelClass = classnames([
            'md-panel',
            { fullscreen: legacy.state.isFullScreen },
        ]);
        const editorClass = classnames([
            'md-editor',
            {
                expand: legacy.state.mode === 'edit',
                monospace: legacy.state.isMonospace,
            },
        ]);
        const previewClass = classnames([
            'md-preview',
            'markdown',
            {
                expand: legacy.state.mode === 'preview',
                shrink: legacy.state.mode === 'edit',
            },
        ]);

        return (
            <div className="editor">
                <div className={panelClass} ref={(div) => (legacy.editorPanel = div)}>
                    <div className="md-menubar">
                        {legacy._getModeBar()}
                        {legacy._getToolBar()}
                    </div>
                    <div className={editorClass}>
                        <textarea
                            ref={(textarea) => (legacy.textControl = textarea)}
                            name="content"
                            onChange={(e) => legacy._onChange(e)}
                            value={props.content}
                        />
                    </div>
                    <div
                        className={previewClass}
                        ref={(div) => (legacy.preview = div)}
                        dangerouslySetInnerHTML={{ __html: legacy.state.result }}
                    />
                    <div
                        className={classnames(
                            { hide: legacy.state.mode !== 'split' },
                            'md-spliter',
                        )}
                    />
                </div>
                <a
                    ref={(a) => (legacy.resizebar = a)}
                    href="###"
                    className="editor__resize"
                >
                    调整高度
                </a>
                <EditorLinkModal
                    open={legacy.state.visible.link}
                    onCancel={() => {
                        legacy.setState({
                            visible: Object.assign({}, legacy.state.visible, {
                                link: false,
                            }),
                        });
                        legacy.linkFormRef.current?.resetFields();
                    }}
                    onCreate={() => legacy.handleLinkCreate()}
                    onFormReady={(ref) => {
                        legacy.linkFormRef = ref;
                    }}
                    innerLinks={props.innerLinks}
                    fetchData={props.fetchData}
                />

                <EditorImageModal
                    open={legacy.state.visible.image}
                    onCancel={() => legacy.imageModalClose()}
                    onOk={() => legacy.handleImageOk()}
                    fileDone={(fileInfo: UploadChangeParam) =>
                        legacy.handleFile(fileInfo)
                    }
                    imageUrl={legacy.state.imageUrl}
                    fileLinkChange={(fileLink: string) =>
                        legacy.handleFileLinkChange(fileLink)
                    }
                    fileLink={legacy.state.fileLink}
                    tabChanged={(key) => legacy.setState({ imageTabKey: key })}
                    tabKey={legacy.state.imageTabKey}
                />
            </div>
        );
    };
    legacy.getValue = function getValue() {
        return legacy.state.content;
    };
    legacy._svgIcon = function _svgIcon(svgHtml: string) {
        return (
            <span
                className="editor-icon"
                dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
        );
    };
    legacy._getToolBar = function _getToolBar() {
        return (
            <ul
                className={classnames('md-toolbar clearfix', {
                    hide: legacy.state.mode === 'preview',
                })}
            >
                <li className="tb-btn">
                    <a
                        title="加粗(Ctrl + B)"
                        onClick={() => legacy._boldText()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.bold)}
                    </a>
                </li>
                <li className="tb-btn">
                    <a
                        title="斜体(Ctrl + I)"
                        onClick={() => legacy._italicText()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.italic)}
                    </a>
                </li>
                <li className="tb-btn">
                    <a
                        title="删除线"
                        onClick={() => legacy._strikethroughText()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.strikethrough)}
                    </a>
                </li>
                <li className="tb-btn">
                    <a
                        title="下划线"
                        onClick={() => legacy._underlineText()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.underline)}
                    </a>
                </li>
                <li className="tb-btn spliter" />
                <li className="tb-btn">
                    <a
                        title="快速链接(Ctrl + K)"
                        onClick={() => legacy._quickLinkText()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.quickLink)}
                    </a>
                </li>
                <li className="tb-btn">
                    <a
                        title="链接(Ctrl + L)"
                        onClick={() => legacy._linkModal()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.link)}
                    </a>
                </li>
                <li className="tb-btn">
                    <a
                        title="引用(Ctrl + Q)"
                        onClick={() => legacy._blockquoteText()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.quote)}
                    </a>
                </li>
                <li className="tb-btn">
                    <a
                        title="行内代码(Ctrl + E)"
                        onClick={() => legacy._inlineCodeText()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.inlineCode)}
                    </a>
                </li>
                <li className="tb-btn">
                    <a
                        title="代码段(Ctrl + Shift + E)"
                        onClick={() => legacy._codeText()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.code)}
                    </a>
                </li>
                <li className="tb-btn">
                    <a
                        title="图片(Ctrl + G)"
                        onClick={() => legacy._pictureText()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.img)}
                    </a>
                </li>
                <li className="tb-btn">
                    <a
                        title="键盘按键"
                        onClick={() => legacy._kbdText()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.kbd)}
                    </a>
                </li>
                <li className="tb-btn">
                    <a
                        title="行内公式(Ctrl + M)"
                        onClick={() => legacy._inlineFormulaText()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.inlineFormula)}
                    </a>
                </li>
                <li className="tb-btn">
                    <a
                        title="块级公式(Ctrl + Shift + M)"
                        onClick={() => legacy._formulaText()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.formula)}
                    </a>
                </li>
                <li className="tb-btn">
                    <Dropdown
                        menu={{ items: legacy._alertMenuItems() }}
                        trigger={['hover']}
                    >
                        <a title="提示框" className="editor-toolbar">
                            {legacy._svgIcon(icons.alert)}
                        </a>
                    </Dropdown>
                </li>
                <li className="tb-btn spliter" />
                <li className="tb-btn">
                    <a
                        title="有序列表(Ctrl + Shift + 7)"
                        onClick={() => legacy._listOlText()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.ol)}
                    </a>
                </li>
                <li className="tb-btn">
                    <a
                        title="无序列表(Ctrl + Shift + 8)"
                        onClick={() => legacy._listUlText()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.ul)}
                    </a>
                </li>
                <li className="tb-btn">
                    <a
                        title="标题(Ctrl + H)"
                        onClick={() => legacy._headerText()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.title)}
                    </a>
                </li>
                <li className="tb-btn spliter" />
                <li className="tb-btn">
                    <a
                        title="分割线(Ctrl + R)"
                        onClick={() => legacy._insertHr()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.hr)}
                    </a>
                </li>
                <li className="tb-btn">
                    <a
                        title="插入 more 标签"
                        onClick={() => legacy._insertMore()}
                        className="editor-toolbar"
                    >
                        {legacy._svgIcon(icons.more)}
                    </a>
                </li>
                <AIToolbar />
                {legacy._getExternalBtn()}
            </ul>
        );
    };
    legacy._getExternalBtn = function _getExternalBtn() {
        return React.Children.map(props.children, (option: any) => {
            if (option.type === 'option') {
                return (
                    <li className="tb-btn">
                        <a {...option.props}>{option.props.children}</a>
                    </li>
                );
            } else {
                return null;
            }
        });
    };
    legacy._getModeBar = function _getModeBar() {
        const checkActive = (mode) => ({ active: legacy.state.mode === mode });

        return (
            <ul className="md-modebar">
                {/* preview mode */}
                <li className="tb-btn pull-right">
                    <a
                        className={classnames(checkActive('preview'), 'editor-toolbar')}
                        onClick={legacy._changeMode('preview')}
                        title="预览模式"
                    >
                        {legacy._svgIcon(icons.preview)}
                    </a>
                </li>
                {/* split mode */}
                <li className="tb-btn pull-right">
                    <a
                        className={classnames(checkActive('split'), 'editor-toolbar')}
                        onClick={legacy._changeMode('split')}
                        title="分屏模式"
                    >
                        {legacy._svgIcon(icons.split)}
                    </a>
                </li>
                {/* edit mode */}
                <li className="tb-btn pull-right">
                    <a
                        className={classnames(checkActive('edit'), 'editor-toolbar')}
                        onClick={legacy._changeMode('edit')}
                        title="编辑模式"
                    >
                        {legacy._svgIcon(icons.edit)}
                    </a>
                </li>
                <li className="tb-btn spliter pull-right" />
                {/* full-screen */}
                <li className="tb-btn pull-right">
                    <a
                        title="全屏模式"
                        onClick={() => legacy._toggleFullScreen()}
                        className={classnames('editor-toolbar')}
                    >
                        {legacy._svgIcon(
                            legacy.state.isFullScreen ? icons.unzen : icons.zen,
                        )}
                    </a>
                </li>
                {/* monospace */}
                <li className="tb-btn pull-right">
                    <a
                        title="等宽字符模式"
                        onClick={() => legacy._toggleMonospace()}
                        className={classnames('editor-toolbar', {
                            'toggle-active': legacy.state.isMonospace,
                        })}
                    >
                        {legacy._svgIcon(icons.monospace)}
                    </a>
                </li>
            </ul>
        );
    };
    legacy._onChange = function _onChange(e: any) {
        let content = e.target.value;
        legacy._schedulePreview(content);
        localStorage['unsavetype' + props.info.type + 'id' + props.info.id + ''] =
            content;
        props.onChange(content);
    };
    legacy._changeMode = function _changeMode(mode: any) {
        return () => {
            legacy.setState({ mode });
        };
    };
    legacy._toggleFullScreen = function _toggleFullScreen() {
        legacy.setState({ isFullScreen: !legacy.state.isFullScreen }, () =>
            props.onFullScreen(legacy.state.isFullScreen),
        );
    };
    legacy._toggleMonospace = function _toggleMonospace() {
        legacy.setState({ isMonospace: !legacy.state.isMonospace });
    };
    legacy._getCursorPos = function _getCursorPos() {
        return (legacy.textControl as HTMLTextAreaElement).selectionStart;
    };
    legacy._preInputText = function _preInputText(
        text: string,
        placeholderOffsetStart: number,
        placeholderOffsetEnd: number,
        opts?: { position?: number; selectAfter?: [number, number] },
    ) {
        const textarea = legacy.textControl as HTMLTextAreaElement;
        const start = opts?.position ?? textarea.selectionStart;
        const end = opts?.position ?? textarea.selectionEnd;

        if (start !== end) {
            const exist = props.content.slice(start, end);
            text =
                text.slice(0, placeholderOffsetStart) +
                exist +
                text.slice(placeholderOffsetEnd);
            placeholderOffsetEnd = placeholderOffsetStart + exist.length;
        }

        // 聚焦并选中要替换的范围
        textarea.focus();
        textarea.setSelectionRange(start, end);

        // 使用 execCommand 插入文本，保留浏览器的 undo/redo 栈
        document.execCommand('insertText', false, text);

        // 选中插入的占位文字，方便用户直接编辑
        const offsetStart =
            ((opts?.selectAfter?.[0] ?? placeholderOffsetStart) + text.length + 1) %
            (text.length + 1);
        const offsetEnd =
            ((opts?.selectAfter?.[1] ?? placeholderOffsetEnd) + text.length + 1) %
            (text.length + 1);
        setTimeout(
            () => textarea.setSelectionRange(start + offsetStart, start + offsetEnd),
            20,
        );
    };
    legacy._boldText = function _boldText() {
        legacy._preInputText('**加粗文字**', 2, 6);
    };
    legacy._italicText = function _italicText() {
        legacy._preInputText('*斜体文字*', 1, 5);
    };
    legacy._strikethroughText = function _strikethroughText() {
        legacy._preInputText('~~删除线文字~~', 2, 7);
    };
    legacy._underlineText = function _underlineText() {
        legacy._preInputText('<ins>下划线文字</ins>', 5, 10);
    };
    legacy._quickLinkText = function _quickLinkText() {
        const textarea = legacy.textControl as HTMLTextAreaElement;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const hasSelection = start !== end;
        if (hasSelection) {
            // 选中文字时：选中内容作为链接文本，光标选中url
            legacy._preInputText('[链接文本](www.yourlink.com)', 1, 5, {
                selectAfter: [-18, -2],
            });
        } else {
            // 未选中文字时：插入后选中text
            legacy._preInputText('[链接文本](www.yourlink.com)', 1, 5);
        }
    };
    legacy._modalLinkText = function _modalLinkText(
        text: string = '链接文本',
        url: string = 'www.yourlink.com',
        selectAction: 'text' | 'url' | 'end' = 'end',
    ) {
        if (selectAction === 'text') {
            legacy._preInputText(`[${text}](${url})`, 1, 1 + text.length);
        } else if (selectAction === 'url') {
            legacy._preInputText(
                `[${text}](${url})`,
                text.length + 3,
                text.length + 3 + url.length,
            );
        } else {
            legacy._preInputText(
                `[${text}](${url})`,
                text.length + url.length + 4,
                text.length + url.length + 4,
            );
        }
    };
    legacy._blockquoteText = function _blockquoteText() {
        legacy._preInputText('> 引用', 2, 4);
    };
    legacy._inlineCodeText = function _inlineCodeText() {
        legacy._preInputText('`code`', 1, 5);
    };
    legacy._codeText = function _codeText() {
        const textarea = legacy.textControl as HTMLTextAreaElement;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const hasSelection = start !== end;
        if (hasSelection) {
            // 选中文字时：选中内容作为代码块，光标移动到语言标识位置
            legacy._preInputText('```\ncode block\n```', 4, 14, { selectAfter: [3, 3] });
        } else {
            // 未选中文字时：插入后选中text
            legacy._preInputText('```\ncode block\n```', 4, 14);
        }
    };
    legacy._linkModal = function _linkModal() {
        legacy.setState({
            visible: Object.assign({}, legacy.state.visible, { link: true }),
        });
    };
    legacy._pictureText = function _pictureText() {
        legacy.setState({
            visible: Object.assign({}, legacy.state.visible, { image: true }),
        });
    };
    legacy._kbdText = function _kbdText() {
        legacy._preInputText('<kbd>键盘按键</kbd>', 5, 9);
    };
    legacy._inlineFormulaText = function _inlineFormulaText() {
        legacy._preInputText('`$行内公式$`', 2, 6);
    };
    legacy._formulaText = function _formulaText() {
        legacy._preInputText('```math\n公式\n```', 8, 10);
    };
    legacy._alertMenuItems = function _alertMenuItems() {
        const types = [
            { key: 'NOTE', label: '说明', color: '#0969da' },
            { key: 'TIP', label: '技巧', color: '#1a7f37' },
            { key: 'IMPORTANT', label: '重要', color: '#8250df' },
            { key: 'WARNING', label: '警告', color: '#9a6700' },
            { key: 'CAUTION', label: '危险', color: '#d1242f' },
        ];

        return types.map((t) => ({
            key: t.key,
            label: (
                <span style={{ color: t.color }}>
                    {t.key}{' '}
                    <span style={{ color: '#999', marginLeft: 8 }}>{t.label}</span>
                </span>
            ),
            onClick: () => legacy._alertText(t.key),
        }));
    };
    legacy._alertText = function _alertText(type: string) {
        const text = `> [!${type}]\n> 提示内容`;
        legacy._preInputText(text, type.length + 8, type.length + 12);
    };
    legacy._toggleListText = function _toggleListText(type: 'ul' | 'ol') {
        const textarea = legacy.textControl as HTMLTextAreaElement;
        const content = props.content;
        const selStart = textarea.selectionStart;
        const selEnd = textarea.selectionEnd;
        const hasSelection = selStart !== selEnd;

        // 扩展选区到整行
        const lineStart = content.lastIndexOf('\n', selStart - 1) + 1;
        let lineEnd = content.indexOf('\n', selEnd);
        if (lineEnd === -1) lineEnd = content.length;

        const selectedText = content.slice(lineStart, lineEnd);
        const lines = selectedText.split('\n');
        const isMulti = lines.length > 1;
        const isUl = type === 'ul';

        // 多行严格匹配行首，单行忽略前导空格
        const ulPattern = /^[*+-] /;
        const olPattern = /^\d+\. /;
        const ulPatternLoose = /^\s*[*+-] /;
        const olPatternLoose = /^\s*\d+\. /;
        const checkPattern = isMulti
            ? isUl
                ? ulPattern
                : olPattern
            : isUl
              ? ulPatternLoose
              : olPatternLoose;
        const allHaveMarker = lines.every((line) => checkPattern.test(line));

        // 全部有标记→移除；否则→给缺标记的行添加（多行在绝对行首，单行在空格后）
        let newLines: string[];
        if (allHaveMarker) {
            if (isMulti) {
                newLines = lines.map((line) =>
                    isUl ? line.replace(/^[*+-] /, '') : line.replace(/^\d+\. /, ''),
                );
            } else {
                newLines = lines.map((line) =>
                    isUl
                        ? line.replace(/^(\s*)[*+-] /, '$1')
                        : line.replace(/^(\s*)\d+\. /, '$1'),
                );
            }
        } else {
            if (isMulti) {
                if (isUl) {
                    newLines = lines.map((line) => '* ' + line);
                } else {
                    newLines = lines.map((line, i) => i + 1 + '. ' + line);
                }
            } else {
                if (isUl) {
                    newLines = lines.map((line) => line.replace(/^(\s*)/, '$1* '));
                } else {
                    newLines = lines.map((line) => line.replace(/^(\s*)/, '$11. '));
                }
            }
        }

        const newText = newLines.join('\n');

        // 使用 execCommand 保留浏览器的 undo/redo 栈
        textarea.focus();
        textarea.setSelectionRange(lineStart, lineEnd);
        document.execCommand('insertText', false, newText);

        // 有选区→扩大到整行；无选区→根据新旧文本长度差调整光标位置
        if (hasSelection) {
            setTimeout(
                () => textarea.setSelectionRange(lineStart, lineStart + newText.length),
                20,
            );
        } else {
            const delta = newText.length - selectedText.length;
            const newStart = selStart + delta;
            setTimeout(() => textarea.setSelectionRange(newStart, newStart), 20);
        }
    };
    legacy._handleEnter = function _handleEnter(): boolean {
        const textarea = legacy.textControl as HTMLTextAreaElement;
        const content = props.content;
        const selStart = textarea.selectionStart;
        const selEnd = textarea.selectionEnd;

        // 找到选区起始行和结束行的位置
        const lineStart = content.lastIndexOf('\n', selStart - 1) + 1;
        let lineEnd = content.indexOf('\n', selEnd);
        if (lineEnd === -1) lineEnd = content.length;
        const fullLine = content.slice(lineStart, lineEnd);

        // 匹配行首列表标记
        const ulMatch = fullLine.match(/^(\s*)([*+-]) /);
        const olMatch = fullLine.match(/^(\s*)(\d+)\. /);
        const match = ulMatch || olMatch;

        if (!match) return false;

        const fullMatch = match[0]; // e.g. "  * " or "  1. "
        const indent = match[1]; // 前导空格
        const contentAfterMarker = fullLine.slice(fullMatch.length);

        // 标记后整行无内容（仅有标记和可选空格）→ 删除整行（含前导空格），不换行
        if (contentAfterMarker.trim() === '') {
            textarea.focus();
            textarea.setSelectionRange(lineStart, selStart);
            document.execCommand('insertText', false, '');
            return true;
        }

        // 标记后有内容 → 续行：插入换行 + 新标记
        const isOl = !!olMatch;
        let newMarker: string;
        if (isOl) {
            newMarker = indent + (parseInt(match[2]) + 1) + '. ';
        } else {
            newMarker = indent + match[2] + ' ';
        }

        // 在光标/选区处插入换行和新列表标记
        textarea.focus();
        textarea.setSelectionRange(selStart, selEnd);
        document.execCommand('insertText', false, '\n' + newMarker);

        // 光标定位到新行标记之后
        const newPos = selStart + 1 + newMarker.length;
        setTimeout(() => textarea.setSelectionRange(newPos, newPos), 20);
        return true;
    };
    legacy._listUlText = function _listUlText() {
        legacy._toggleListText('ul');
    };
    legacy._listOlText = function _listOlText() {
        legacy._toggleListText('ol');
    };
    legacy._handleTab = function _handleTab() {
        const textarea = legacy.textControl as HTMLTextAreaElement;
        const content = props.content;
        const selStart = textarea.selectionStart;
        const selEnd = textarea.selectionEnd;
        const hasSelection = selStart !== selEnd;

        if (!hasSelection) {
            document.execCommand('insertText', false, '    ');
            return;
        }

        // 扩展选区到整行
        const lineStart = content.lastIndexOf('\n', selStart - 1) + 1;
        let lineEnd = content.indexOf('\n', selEnd);
        if (lineEnd === -1) lineEnd = content.length;

        const selectedText = content.slice(lineStart, lineEnd);
        const lines = selectedText.split('\n');
        const newLines = lines.map((line) => '    ' + line);
        const newText = newLines.join('\n');

        textarea.focus();
        textarea.setSelectionRange(lineStart, lineEnd);
        document.execCommand('insertText', false, newText);
        setTimeout(
            () => textarea.setSelectionRange(lineStart, lineStart + newText.length),
            20,
        );
    };
    legacy._handleShiftTab = function _handleShiftTab() {
        const textarea = legacy.textControl as HTMLTextAreaElement;
        const content = props.content;
        const selStart = textarea.selectionStart;
        const selEnd = textarea.selectionEnd;
        const hasSelection = selStart !== selEnd;

        // 扩展选区到整行
        const lineStart = content.lastIndexOf('\n', selStart - 1) + 1;
        let lineEnd = content.indexOf('\n', selEnd);
        if (lineEnd === -1) lineEnd = content.length;

        const selectedText = content.slice(lineStart, lineEnd);
        const lines = selectedText.split('\n');
        const newLines = lines.map((line) => line.replace(/^( {1,4})/, ''));
        const newText = newLines.join('\n');

        textarea.focus();
        textarea.setSelectionRange(lineStart, lineEnd);
        document.execCommand('insertText', false, newText);

        if (hasSelection) {
            setTimeout(
                () => textarea.setSelectionRange(lineStart, lineStart + newText.length),
                20,
            );
        } else {
            // 计算光标在行内的相对位置
            const cursorOffsetInLine = selStart - lineStart;
            const oldLine = lines[0];
            const newLine = newLines[0];
            const removed = oldLine.length - newLine.length;
            const newPos = Math.max(lineStart + cursorOffsetInLine - removed, lineStart);
            setTimeout(() => textarea.setSelectionRange(newPos, newPos), 20);
        }
    };
    legacy._headerText = function _headerText() {
        legacy._preInputText('# 标题', 2, 4);
    };
    legacy._insertMore = function _insertMore() {
        legacy._preInputText('<!--more-->', 11, 11);
    };
    legacy._insertHr = function _insertHr() {
        legacy._preInputText('---\n\n', 5, 5);
    };
    React.useEffect(() => {
        legacy.onMount();
        return () => legacy.onUnmount();
    }, []);
    const previousRef = React.useRef({ props: props, state: state, mounted: false });
    React.useEffect(() => {
        if (previousRef.current.mounted) legacy.onPropsChange(previousRef.current.props);
        previousRef.current = { props: props, state: state, mounted: true };
    });
    return legacy.render();
}

export default MarkDownEditor;
