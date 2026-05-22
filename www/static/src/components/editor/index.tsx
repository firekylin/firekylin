/**
 * 本项目的编辑器是由 https://github.com/leozdgao/react-markdown 该项目修改而来，感谢作者的无私奉献！
 */
import { marked } from 'marked';
import classnames from 'classnames';
import * as React from 'react';

// import Search from './search';
import './style.less';
import * as icons from './icons';
import { Modal, message, FormInstance, UploadChangeParam, Dropdown } from 'antd';
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

class MarkDownEditor extends React.Component<MdEditorProps, any> {
  static defaultProps = {
    content: ''
  };
  textControl: HTMLTextAreaElement | null;
  previewControl: any;
  _syncScroll: any;
  _ltr: any;

  editorPanel: HTMLDivElement | null;
  editor: HTMLTextAreaElement | null;
  preview: HTMLDivElement | null;
  resizebar: HTMLAnchorElement | null;

  linkFormRef: React.RefObject<FormInstance> = React.createRef<FormInstance>();
  imagePath: string;
  fileInfo: UploadChangeParam;

  state = this.initialState();

  initialState () {
    return {
      panelClass: 'md-panel',
      mode: 'split',
      isFullScreen: false,
      result: marked(this.props.content),
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
  }

  componentDidMount () {
    // cache dom node
    this.previewControl = this.preview;
    this._syncScroll = (() => {
      let leftSync = false, rightSync = false;
      let that = this;

      return function(e: any) {
        let scrollEle = e.target;
        let syncEle = scrollEle === that.textControl ? that.previewControl : that.textControl;
        let percent = scrollEle.scrollTop / (scrollEle.scrollHeight - scrollEle.clientHeight);
        if (leftSync && scrollEle === that.previewControl) {
          return true;
        }
        if (rightSync && scrollEle === that.textControl) {
          return true;
        }

        leftSync = scrollEle === that.textControl;
        rightSync = scrollEle === that.previewControl;
        syncEle.scrollTop = percent * (syncEle.scrollHeight - syncEle.clientHeight);

        setTimeout(() => leftSync = rightSync = false, 100);
      };
    })();

    if (localStorage['unsavetype' + this.props.info.type + 'id' + this.props.info.id + '']) {
        confirm({
          title: '提示',
          content: '检测到上次没有保存文章就退出页面，是否从缓存里恢复文章?',
            onOk: () => {
                let content = localStorage['unsavetype' + this.props.info.type + 'id' + this.props.info.id];
                this.setState({ result: marked(content) });
                this.props.onChange(content);
            },
            onCancel: () => {
              localStorage.removeItem('unsavetype' + this.props.info.type + 'id' + this.props.info.id);
            }
        });
    }
    (this.textControl as HTMLTextAreaElement).addEventListener('keydown', e => this._bindKey(e));
    (this.textControl as HTMLTextAreaElement).addEventListener('paste', e => this._bindPaste(e));
    (this.textControl as HTMLTextAreaElement).addEventListener('scroll', e => this._syncScroll(e), false);
    this.previewControl.addEventListener('scroll', this._syncScroll, false);
    this._bindMouse();
  }

  _bindPaste(e: ClipboardEvent) {
    let clipboard = e.clipboardData;
    let FileList = Array.from(clipboard.items)
      .filter((item: any) => item.kind === 'file' && item.type.indexOf('image') > -1)
      .map((item: any) => item.getAsFile());
    if (!FileList.length) {
      return true;
    }

    e.preventDefault();
    let data = new FormData();
    data.append('file', FileList[0]);
    this.upLoadImage(data, FileList[0].name);
  }

  _bindMouse() {
    const panel = this.editorPanel;
    const resizebar = this.resizebar;

    (resizebar as HTMLAnchorElement).addEventListener('mousedown', function resizeStart(e: MouseEvent) {
      e.preventDefault();

      const start = e.pageY, oHeight = (panel as HTMLElement).clientHeight;
      // tslint:disable-next-line:no-shadowed-variable
      const resize = e => {
        e.preventDefault();
        (panel as HTMLElement).style.height = oHeight + e.pageY - start + 'px';
      };

      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', () => {
        window.removeEventListener('mousemove', resize);
      });
    });
  }

  _bindKey(e: KeyboardEvent) {
    if (e.keyCode === 9) {
      this._preInputText('    ', 4, 4);
      return e.preventDefault();
    }

    if (!e.metaKey && !e.ctrlKey) { return true; }
    let key = String.fromCharCode(e.keyCode).toUpperCase();

    // Ctrl+Shift+E → 代码段
    if (e.shiftKey && key === 'E') {
      this._codeText();
      return e.preventDefault();
    }

    let keys = {
      B: this._boldText,
      I: this._italicText,
      K: this._quickLinkText,
      L: this._linkModal,
      Q: this._blockquoteText,
      E: this._inlineCodeText,
      G: this._pictureText,
      O: this._listOlText,
      U: this._listUlText,
      H: this._headerText,
      M: this._insertMore,
      R: this._insertHr
    };

    if (keys[key]) {
      keys[key].bind(this)();
      return e.preventDefault();
    }
  }

  componentWillReceiveProps(nextProps: any) {
    if (nextProps.content === this.props.content) { return; }
    this.setState({result: marked(nextProps.content)});
  }

  componentWillUnmount () {
    this.textControl = null;
    this.previewControl = null;
  }

  handleLinkCreate() {
    this.linkFormRef.current?.validateFields().then(values => {
      this.setState({linkText: values.linkText, linkUrl: values.linkUrl});

      if (values.innerLinkUrl || values.innerLinkText) {
        values.linkUrl = `${location.origin}/post/${values.innerLinkUrl}.html`;
        values.linkText = values.innerLinkText;
      }

      const hasUrl = !!values.linkUrl;
      const hasText = !!values.linkText;

      if (hasUrl && hasText) {
        // 都输入了：光标到末尾
        this._modalLinkText(values.linkText, values.linkUrl, 'end');
      } else if (hasText && !hasUrl) {
        // 有文本没地址：选中url
        this._modalLinkText(values.linkText, 'www.yourlink.com', 'url');
      } else if (hasUrl && !hasText) {
        // 有地址没文本：选中text
        this._modalLinkText('链接文本', values.linkUrl, 'text');
      } else {
        // 都没输入：选中text
        this._modalLinkText('链接文本', 'www.yourlink.com', 'text');
      }

      this.linkFormRef.current?.resetFields();
      this.setState({ visible: Object.assign({}, this.state.visible, {link: false}) });
    }).catch(() => {
      // validation failed, do nothing
    });
  }

  handleImageOk() {
    if (!this.state.imageUrl && !this.state.fileLink) {
      message.warning('请插入图片');
      return;
    }
    const start = (this._getCursorPos() as number);
    if (this.state.imageTabKey === '0') {
      const fileName = this.fileInfo.file.name;
      let fileUrl = this.imagePath;
      if(!/^(https?:)?\/\/.+/i.test(this.imagePath)) {
        fileUrl = location.origin + fileUrl;
      }
      this._preInputText(`![${fileName}](${fileUrl})`, 2, fileName.length + 2, { position: start });
      this.imageModalClose();
    } else {
      if (this.state.fileLink) {
        const data = new FormData();
        data.append('fileUrl', this.state.fileLink);
        this.upLoadImage(data);
      }
    }
  }

  upLoadImage(data: FormData, fileName: string = 'alt') {
    const start = (this._getCursorPos() as number);
    http.upload(data)
      .then(
        res => {
          const reg = /^(https?:)?\/\/.+/i;
          if (!reg.test(res.data)) {
            res.data = location.origin + res.data;
          }
          const text = this.state.fileLink ? '链接文本' : fileName;
          if (text === 'alt') {
            this._preInputText(`![${text}](${res.data})`, 2, 5, { position: start });
          } else {
            this._preInputText(`![${text}](${res.data})`, 2, text.length + 2, { position: start });
          }
          this.imageModalClose();
        }
      )
      .catch((res) => {
        message.error(res.errmsg);
      });
  }

  getBase64(img: any, callback: Function) {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result));
    reader.readAsDataURL(img);
  }

  handleFile(fileInfo: UploadChangeParam) {
    if (fileInfo.file.response.errno !== 0) {
      message.error(fileInfo.file.response.errmsg);
    } else {
      this.fileInfo = fileInfo;
      this.getBase64(fileInfo.file.originFileObj, imageUrl => this.setState({
        imageUrl
      }));
      this.imagePath = fileInfo.file.response.data;
    }
  }

  handleFileLinkChange(fileLink: string) {
    this.setState({fileLink: fileLink});
  }

  imageModalClose() {
    this.setState({visible: Object.assign({}, this.state.visible, {image: false}), imageUrl: '', imagePath: '', fileLink: ''});
    this.imagePath = '';
  }

  render () {
    const panelClass = classnames([ 'md-panel', { 'fullscreen': this.state.isFullScreen } ]);
    const editorClass = classnames([ 'md-editor', { 'expand': this.state.mode === 'edit' } ]);
    const previewClass = classnames([ 'md-preview', 'markdown', { 'expand': this.state.mode === 'preview', 'shrink': this.state.mode === 'edit' } ]);

    return (
      <div className="editor">
        <div className={panelClass} ref={div => this.editorPanel = div}>
          <div className="md-menubar">
            {this._getModeBar()}
            {this._getToolBar()}
          </div>
          <div className={editorClass}>
            <textarea
                ref={textarea => this.textControl = textarea}
                name="content"
                onChange={e => this._onChange(e)}
                value={this.props.content}
            />
          </div>
          <div className={previewClass} ref={div => this.preview = div} dangerouslySetInnerHTML={{ __html: this.state.result }}/>
          <div className={classnames({hide: this.state.mode !== 'split'}, 'md-spliter')} />
        </div>
        <a ref={a => this.resizebar = a} href="###" className="editor__resize">调整高度</a>
        <EditorLinkModal
          visible={this.state.visible.link}
          onCancel={() => {this.setState({visible: Object.assign({}, this.state.visible, {link: false})}); this.linkFormRef.current?.resetFields(); }}
          onCreate={() => this.handleLinkCreate()}
          onFormReady={ref => { this.linkFormRef = ref; }}
          innerLinks={this.props.innerLinks}
          fetchData={this.props.fetchData}
        />
        <EditorImageModal
          visible={this.state.visible.image}
          onCancel={() => this.imageModalClose()}
          onOk={() => this.handleImageOk()}
          fileDone={(fileInfo: UploadChangeParam) => this.handleFile(fileInfo)}
          imageUrl={this.state.imageUrl}
          fileLinkChange={(fileLink: string) => this.handleFileLinkChange(fileLink)}
          fileLink={this.state.fileLink}
          tabChanged={key => this.setState({imageTabKey: key})}
          tabKey={this.state.imageTabKey}
        />
      </div>
    );
  }

  getValue () {
    return this.state.content;
  }

  _svgIcon(svgHtml: string) {
    return <span className="editor-icon" dangerouslySetInnerHTML={{ __html: svgHtml }} />;
  }

  // widgets constructors
  _getToolBar () {
    return (
      <ul className={classnames('md-toolbar clearfix', {hide: this.state.mode === 'preview'})}>
        <li className="tb-btn"><a title="加粗(Ctrl + B)" onClick={() => this._boldText()} className="editor-toolbar">{this._svgIcon(icons.bold)}</a></li>
        <li className="tb-btn"><a title="斜体(Ctrl + I)" onClick={() => this._italicText()} className="editor-toolbar">{this._svgIcon(icons.italic)}</a></li>
        <li className="tb-btn"><a title="删除线" onClick={() => this._strikethroughText()} className="editor-toolbar">{this._svgIcon(icons.strikethrough)}</a></li>
        <li className="tb-btn"><a title="下划线" onClick={() => this._underlineText()} className="editor-toolbar">{this._svgIcon(icons.underline)}</a></li>
        <li className="tb-btn spliter" />
        <li className="tb-btn"><a title="快速链接(Ctrl + K)" onClick={() => this._quickLinkText()} className="editor-toolbar">{this._svgIcon(icons.quickLink)}</a></li>
        <li className="tb-btn"><a title="链接(Ctrl + L)" onClick={() => this._linkModal()} className="editor-toolbar">{this._svgIcon(icons.link)}</a></li>
        <li className="tb-btn"><a title="引用(Ctrl + Q)" onClick={() => this._blockquoteText()} className="editor-toolbar">{this._svgIcon(icons.quote)}</a></li>
        <li className="tb-btn"><a title="行内代码(Ctrl + E)" onClick={() => this._inlineCodeText()} className="editor-toolbar">{this._svgIcon(icons.inlineCode)}</a></li>
        <li className="tb-btn"><a title="代码段(Ctrl + Shift + E)" onClick={() => this._codeText()} className="editor-toolbar">{this._svgIcon(icons.code)}</a></li>
        <li className="tb-btn"><a title="图片(Ctrl + G)" onClick={() => this._pictureText()} className="editor-toolbar">{this._svgIcon(icons.img)}</a></li>
        <li className="tb-btn"><a title="键盘按键" onClick={() => this._kbdText()} className="editor-toolbar">{this._svgIcon(icons.kbd)}</a></li>
        <li className="tb-btn">
          <Dropdown menu={{ items: this._alertMenuItems() }} trigger={['hover']}>
            <a title="提示框" className="editor-toolbar">{this._svgIcon(icons.alert)}</a>
          </Dropdown>
        </li>
        <li className="tb-btn spliter"/>
        <li className="tb-btn"><a title="有序列表(Ctrl + O)" onClick={() => this._listOlText()} className="editor-toolbar">{this._svgIcon(icons.ol)}</a></li>
        <li className="tb-btn"><a title="无序列表(Ctrl + U)" onClick={() => this._listUlText()} className="editor-toolbar">{this._svgIcon(icons.ul)}</a></li>
        <li className="tb-btn"><a title="标题(Ctrl + H)" onClick={() => this._headerText()} className="editor-toolbar">{this._svgIcon(icons.title)}</a></li>
        <li className="tb-btn spliter"/>
        <li className="tb-btn"><a title="分割线(Ctrl + R)" onClick={() => this._insertHr()} className="editor-toolbar">{this._svgIcon(icons.hr)}</a></li>
        <li className="tb-btn"><a title="插入 more 标签(Ctrl + M)" onClick={() => this._insertMore()} className="editor-toolbar">{this._svgIcon(icons.more)}</a></li>
        {this._getExternalBtn()}
      </ul>
    );
  }

  _getExternalBtn () {
    return React.Children.map(this.props.children, (option: any) => {
      if (option.type === 'option') {
        return <li className="tb-btn"><a {...option.props}>{option.props.children}</a></li>;
      } else {
        return null;
      }
    });
  }

  _getModeBar () {
    const checkActive = (mode) => ({ active: this.state.mode === mode });

    return (
      <ul className="md-modebar">
        {/* preview mode */}
        <li className="tb-btn pull-right">
          <a className={classnames(checkActive('preview'), 'editor-toolbar')} onClick={this._changeMode('preview')} title="预览模式">{this._svgIcon(icons.preview)}</a>
        </li>
        {/* split mode */}
        <li className="tb-btn pull-right">
          <a className={classnames(checkActive('split'), 'editor-toolbar')} onClick={this._changeMode('split')} title="分屏模式">{this._svgIcon(icons.split)}</a>
        </li>
        {/* edit mode */}
        <li className="tb-btn pull-right">
          <a className={classnames(checkActive('edit'), 'editor-toolbar')} onClick={this._changeMode('edit')} title="编辑模式">{this._svgIcon(icons.edit)}</a>
        </li>
        <li className="tb-btn spliter pull-right" />
        {/* full-screen */}
        <li className="tb-btn pull-right">
          <a title="全屏模式"
            onClick={() => this._toggleFullScreen()}
            className={classnames('editor-toolbar')}
          >{this._svgIcon(this.state.isFullScreen ? icons.unzen : icons.zen)}</a>
        </li>
      </ul>
    );
  }

  // event handlers
  _onChange (e: any) {
    if (this._ltr) {
      clearTimeout(this._ltr);
    }
    let content = e.target.value;
    this._ltr = setTimeout(() => {
      this.setState({ result: marked(content) });
      localStorage['unsavetype' + this.props.info.type + 'id' + this.props.info.id + ''] = content;
    },                     300);
    this.props.onChange(content);
  }

  _changeMode (mode: any) {
    return () => {
      this.setState({ mode });
    };
  }

  _toggleFullScreen () {
    this.setState({ isFullScreen: !this.state.isFullScreen }, () => this.props.onFullScreen(this.state.isFullScreen));
  }

  _getCursorPos() {
    return (this.textControl as HTMLTextAreaElement).selectionStart;
  }

  // 在光标处插入 Markdown 文本
  // @param text            要插入的模板文本
  // @param placeholderOffsetStart/End  占位文字在模板中的范围，用于：
  //                               1) 有选中文本时，将选中内容合并到此范围
  //                               2) 插入后默认选中此范围（未指定 opts.selectAfter 时）
  // @param opts.position     覆盖插入位置（默认为当前光标位置）
  // @param opts.selectAfter  插入后选中范围 [start, end]，相对于插入起始位置的偏移，支持负数以实现相对于插入末尾位置的偏移（-1为末尾）
  _preInputText (text: string, placeholderOffsetStart: number, placeholderOffsetEnd: number, opts?: { position?: number, selectAfter?: [number, number] }) {
    const textarea = this.textControl as HTMLTextAreaElement;
    const start = opts?.position ?? textarea.selectionStart;
    const end = opts?.position ?? textarea.selectionEnd;

    if (start !== end) {
      const exist = this.props.content.slice(start, end);
      text = text.slice(0, placeholderOffsetStart) + exist + text.slice(placeholderOffsetEnd);
      placeholderOffsetEnd = placeholderOffsetStart + exist.length;
    }

    // 聚焦并选中要替换的范围
    textarea.focus();
    textarea.setSelectionRange(start, end);

    // 使用 execCommand 插入文本，保留浏览器的 undo/redo 栈
    document.execCommand('insertText', false, text);

    // 选中插入的占位文字，方便用户直接编辑
    const offsetStart = ((opts?.selectAfter?.[0] ?? placeholderOffsetStart) + text.length + 1) % (text.length + 1);
    const offsetEnd = ((opts?.selectAfter?.[1] ?? placeholderOffsetEnd) + text.length + 1) % (text.length + 1);
    setTimeout(() => textarea.setSelectionRange(start + offsetStart, start + offsetEnd), 20);
  }

  _boldText () {
    this._preInputText('**加粗文字**', 2, 6);
  }

  _italicText () {
    this._preInputText('_斜体文字_', 1, 5);
  }

  _strikethroughText () {
    this._preInputText('~~删除线文字~~', 2, 7);
  }

  _underlineText () {
    this._preInputText('<ins>下划线文字</ins>', 5, 10);
  }

  _quickLinkText () {
    const textarea = this.textControl as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const hasSelection = start !== end;
    if (hasSelection) {
      // 选中文字时：选中内容作为链接文本，光标选中url
      this._preInputText('[链接文本](www.yourlink.com)', 1, 5, { selectAfter: [-18, -2] });
    } else {
      // 未选中文字时：插入后选中text
      this._preInputText('[链接文本](www.yourlink.com)', 1, 5);
    }
  }

  // 插入[text](url)并根据selectAction选中对应部分或移动光标到末尾
  _modalLinkText (text: string = '链接文本', url: string = 'www.yourlink.com', selectAction: 'text' | 'url' | 'end' = 'end') {
    if (selectAction === 'text') {
      this._preInputText(`[${text}](${url})`, 1, 1 + text.length);
    } else if (selectAction === 'url') {
      this._preInputText(`[${text}](${url})`, text.length + 3, text.length + 3 + url.length);
    } else {
      this._preInputText(`[${text}](${url})`, text.length + url.length + 4, text.length + url.length + 4);
    }
  }

  _blockquoteText () {
    this._preInputText('> 引用', 2, 4);
  }

  _inlineCodeText () {
    this._preInputText('`code`', 1, 5);
  }

  _codeText () {
    this._preInputText('```\ncode block\n```', 4, 14);
  }

  _linkModal() {
    this.setState({visible: Object.assign({}, this.state.visible, {link: true})});
  }

  _pictureText () {
    this.setState({visible: Object.assign({}, this.state.visible, {image: true})});
  }

  _kbdText () {
    this._preInputText('<kbd>键盘按键</kbd>', 5, 9);
  }

  _alertMenuItems () {
    const types = [
      { key: 'NOTE', label: '说明', color: '#0969da' },
      { key: 'TIP', label: '技巧', color: '#1a7f37' },
      { key: 'IMPORTANT', label: '重要', color: '#8250df' },
      { key: 'WARNING', label: '警告', color: '#9a6700' },
      { key: 'CAUTION', label: '危险', color: '#d1242f' },
    ];
    return types.map(t => ({
      key: t.key,
      label: <span style={{ color: t.color }}>{t.key} <span style={{ color: '#999', marginLeft: 8 }}>{t.label}</span></span>,
      onClick: () => this._alertText(t.key),
    }));
  }

  _alertText (type: string) {
    const text = `> [!${type}]\n> 提示内容`;
    this._preInputText(text, type.length + 8, type.length + 12);
  }

  _toggleListText (type: 'ul' | 'ol') {
    const textarea = this.textControl as HTMLTextAreaElement;
    const content = this.props.content;
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
    const checkPattern = isMulti ? (isUl ? ulPattern : olPattern) : (isUl ? ulPatternLoose : olPatternLoose);
    const allHaveMarker = lines.every(line => checkPattern.test(line));

    // 全部有标记→移除；否则→给缺标记的行添加（多行在绝对行首，单行在空格后）
    let newLines: string[];
    if (allHaveMarker) {
      if (isMulti) {
        newLines = lines.map(line =>
          isUl ? line.replace(/^[*+-] /, '') : line.replace(/^\d+\. /, '')
        );
      } else {
        newLines = lines.map(line =>
          isUl ? line.replace(/^(\s*)[*+-] /, '$1') : line.replace(/^(\s*)\d+\. /, '$1')
        );
      }
    } else {
      if (isMulti) {
        if (isUl) {
          newLines = lines.map(line => '* ' + line);
        } else {
          newLines = lines.map((line, i) => (i + 1) + '. ' + line);
        }
      } else {
        if (isUl) {
          newLines = lines.map(line => line.replace(/^(\s*)/, '$1* '));
        } else {
          newLines = lines.map(line => line.replace(/^(\s*)/, '$11. '));
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
      setTimeout(() => textarea.setSelectionRange(lineStart, lineStart + newText.length), 20);
    } else {
      const delta = newText.length - selectedText.length;
      const newStart = selStart + delta;
      setTimeout(() => textarea.setSelectionRange(newStart, newStart), 20);
    }
  }

  _listUlText () {
    this._toggleListText('ul');
  }

  _listOlText () {
    this._toggleListText('ol');
  }

  _headerText () {
    this._preInputText('# 标题', 2, 4);
  }

  _insertMore() {
    this._preInputText('<!--more-->', 11, 11);
  }

  _insertHr() {
    this._preInputText('---\n\n', 5, 5);
  }
}

export default MarkDownEditor;
