/**
 * 本项目的编辑器是由 https://github.com/leozdgao/react-markdown 该项目修改而来，感谢作者的无私奉献！
 */
import marked from 'marked';
import classnames from 'classnames';
import * as React from 'react';

// import Search from './search';
import './style.less';
import { Modal, Form, message } from 'antd';
import EditorLinkModal from './link-modal/link-modal';
import { WrappedFormUtils } from 'antd/lib/form/Form';
import EditorImageModal from './image-modal/image-modal';
import { UploadChangeParam } from 'antd/lib/upload';
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
  _isDirty = false;
  _ltr: any;

  editorPanel: HTMLDivElement | null;
  editor: HTMLTextAreaElement | null;
  preview: HTMLDivElement | null;
  resizebar: HTMLAnchorElement | null;

  linkRef: Form;
  imageRef: Form;
  imagePath: string;
  fileInfo: UploadChangeParam;

  sectionRangeEnd: number;

  state = this.initialState();

  initialState () {
    return {
      panelClass: 'md-panel',
      mode: 'split',
      isFullScreen: false,
      result: this.toHtml(this.props.content),
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
    let keys = {
      B: this._boldText,
      I: this._italicText,
      L: this._linkModal,
      Q: this._blockquoteText,
      K: this._codeText,
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
    const form = this.linkRef.props.form;
    (form as WrappedFormUtils).validateFields((err, values) => {
      if (err) {
        return;
      }
      this.setState({linkText: values.linkText, linkUrl: values.linkUrl});

      if (values.innerLinkUrl || values.innerLinkText) {
        values.linkUrl = `${location.origin}/post/${values.innerLinkUrl}.html`;
        values.linkText = values.innerLinkText;
      }

      if (values.linkUrl && values.linkText) {
        const linkUrl = values.linkUrl;
        this._linkText(linkUrl, values.linkText, false);
      } else {
        this._linkText();
      }

      (form as WrappedFormUtils).resetFields();
      this.setState({ visible: Object.assign({}, this.state.visible, {link: false}) });
    });
  }

  handleImageOk() {
    if (!this.state.imageUrl && !this.state.fileLink) {
      message.warning('请插入图片');
      return;
    }
    const start = (this._cleanSelect() as number);
    if (this.state.imageTabKey === '0') {
      const fileName = this.fileInfo.file.name;
      this._preInputText(`![${fileName}](${location.origin + this.imagePath})`, 2, fileName.length + 2, start);
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
    const start = (this._cleanSelect() as number);
    http.upload(data)
      .then(
        res => {
          const reg = /^(https?:)?\/\/.+/;
          if (!reg.test(res.data)) {
            res.data = location.origin + res.data;
          }
          const text = this.state.fileLink ? '链接文本' : fileName;
          if (text === 'alt') {
            this._preInputText(`![${text}](${res.data})`, 2, 5, start);
          } else {
            this._preInputText(`![${text}](${res.data})`, 2, text.length + 2, start);
          }
          
          this.imageModalClose();
        }
      )
      .catch((res) => {
        this._cleanSelect();
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
        <a ref={a => this.resizebar = a} href="javascript:void(0);" className="editor__resize">调整高度</a>
        <EditorLinkModal
          visible={this.state.visible.link} 
          onCancel={() => {this.setState({visible: Object.assign({}, this.state.visible, {link: false})}); (this.linkRef.props.form as WrappedFormUtils).resetFields(); }}
          onCreate={() => this.handleLinkCreate()}
          wrappedComponentRef={linkRef => this.linkRef = linkRef}
          innerLinks={this.props.innerLinks}
          fetchData={this.props.fetchData}
        />
        <EditorImageModal
          visible={this.state.visible.image} 
          onCancel={() => this.imageModalClose()}
          onOk={() => this.handleImageOk()}
          wrappedComponentRef={imageRef => this.imageRef = imageRef}
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

  toHtml(text: any) {
    return marked(text, {sanitize: true});
  }
  // public methods
  isDirty () {
    return this._isDirty || false;
  }

  getValue () {
    return this.state.content;
  }

  // widgets constructors
  _getToolBar () {
    return (
      <ul className={classnames('md-toolbar clearfix', {hide: this.state.mode === 'preview'})}>
        <li className="tb-btn"><a title="加粗(Ctrl + B)" onClick={() => this._boldText()} className="editor-toolbar bold"><span /></a></li>{/* bold */}
        <li className="tb-btn"><a title="斜体(Ctrl + I)" onClick={() => this._italicText()} className="editor-toolbar italic"/></li>{/* italic */}
        <li className="tb-btn spliter" />
        <li className="tb-btn"><a title="链接(Ctrl + L)" onClick={() => this._linkModal()} className="editor-toolbar link"/></li>{/* link */}
        <li className="tb-btn"><a title="引用(Ctrl + Q)" onClick={() => this._blockquoteText()} className="editor-toolbar quote"/></li>{/* blockquote */}
        <li className="tb-btn"><a title="代码段(Ctrl + K)" onClick={() => this._codeText()} className="editor-toolbar code"/></li>{/* code */}
        <li className="tb-btn"><a title="图片(Ctrl + G)" onClick={() => this._pictureText()} className="editor-toolbar img"/></li>{/* picture-o */}
        <li className="tb-btn spliter"/>
        <li className="tb-btn"><a title="有序列表(Ctrl + O)" onClick={() => this._listOlText()} className="editor-toolbar ol"/></li>{/* list-ol */}
        <li className="tb-btn"><a title="无序列表(Ctrl + U)" onClick={() => this._listUlText()} className="editor-toolbar ul"/></li>{/* list-ul */}
        <li className="tb-btn"><a title="标题(Ctrl + H)" onClick={() => this._headerText()} className="editor-toolbar title"/></li>{/* header */}
        <li className="tb-btn spliter"/>
        <li className="tb-btn"><a title="分割线(Ctrl + R)" onClick={() => this._insertHr()} className="editor-toolbar hr"/></li>
        <li className="tb-btn"><a title="插入 more 标签(Ctrl + M)" onClick={() => this._insertMore()} className="editor-toolbar two"/></li>{/* more */}
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
          <a className={classnames(checkActive('preview'), 'editor-toolbar preview')} onClick={this._changeMode('preview')} title="预览模式"/>
        </li> 
        {/* split mode */}
        <li className="tb-btn pull-right">
          <a className={classnames(checkActive('split'), 'editor-toolbar live')} onClick={this._changeMode('split')} title="分屏模式"/>
        </li> 
        {/* edit mode */}
        <li className="tb-btn pull-right">
          <a className={classnames(checkActive('edit'), 'editor-toolbar edit')} onClick={this._changeMode('edit')} title="编辑模式"/>
        </li> 
        <li className="tb-btn spliter pull-right" />
        {/* full-screen */}
        <li className="tb-btn pull-right">
          <a title="全屏模式"
            onClick={() => this._toggleFullScreen()} 
            className={classnames({unzen: this.state.isFullScreen, zen: !this.state.isFullScreen}, 'editor-toolbar')}
          />
        </li> 
      </ul>
    );
  }

  // event handlers
  _onChange (e: any) {
    this._isDirty = true; // set dirty
    if (this._ltr) {
      clearTimeout(this._ltr);
    }
    let content = e.target.value;
    this._ltr = setTimeout(() => {
      this.setState({ result: this.toHtml(content) }); // change state
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

  _cleanSelect() {
    const start = (this.textControl as HTMLTextAreaElement).selectionStart;
    let text = this.props.content;

    this.setState({ result: marked(text) });
    this.props.onChange(text);

    return start;
  }

  // default text processors
  _preInputText (text: string, preStart: number, preEnd: number, selectStart?: number) {
    const start = selectStart || (this.textControl as HTMLTextAreaElement).selectionStart;
    const end = selectStart || (this.textControl as HTMLTextAreaElement).selectionEnd;
    const origin = this.props.content;

    if (start !== end) {
      const exist = origin.slice(start, end);
      text = text.slice(0, preStart) + exist + text.slice(preEnd);
      preEnd = preStart + exist.length;
    }
    let content = origin.slice(0, start) + text + origin.slice(end);

    // pre-select
    setTimeout(() => (this.textControl as HTMLTextAreaElement).setSelectionRange(start + preStart, start + preEnd), 20);
    this.setState({ result: marked(content) }); // change state
    this.sectionRangeEnd = start + preEnd;
    this.props.onChange(content);
  }

  _boldText () {
    this._preInputText('**加粗文字**', 2, 6);
  }

  _italicText () {
    this._preInputText('_斜体文字_', 1, 5);
  }

  _linkText (url: string = 'www.yourlink.com', text: string = '链接文本', select: boolean = true) {
    let start = 1, end = 1 + text.length;
    if (!select) {
      start = end = text.length + url.length + 4;
    }

    this._preInputText(`[${text}](${url})`, start, end);
  }

  _blockquoteText () {
    this._preInputText('\n> 引用', 3, 5);
  }

  _codeText () {
    this._preInputText('\n```\ncode block\n```', 5, 15);
  }

  _linkModal() {
    this.setState({visible: Object.assign({}, this.state.visible, {link: true})});
  }

  _pictureText () {
    this.setState({visible: Object.assign({}, this.state.visible, {image: true})});
  }

  _listUlText () {
    this._preInputText('- 无序列表项0\n- 无序列表项1', 2, 8);
  }

  _listOlText () {
    this._preInputText('1. 有序列表项0\n2. 有序列表项1', 3, 9);
  }

  _headerText () {
    this._preInputText('## 标题', 3, 5);
  }

  _insertMore() {
    this._preInputText('\n<!--more-->', 12, 12);
  }

  _insertHr() {
    this._preInputText('\n----------', 11, 11);
  }
}

export default MarkDownEditor;
