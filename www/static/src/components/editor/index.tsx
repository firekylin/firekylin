/**
 * 本项目的编辑器是由 https://github.com/leozdgao/react-markdown 该项目修改而来，感谢作者的无私奉献！
 */
import marked from 'marked';
import classnames from 'classnames';
import * as React from 'react';

// import Search from './search';
import './style.less';
import firekylin from '../../utils/firekylin';
import { Modal, Tabs, Form, Input } from 'antd';
import EditorLinkModal from './link-modal/link-modal';
import { WrappedFormUtils } from 'antd/lib/form/Form';
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
  textControl: any;
  previewControl: any;
  _syncScroll: any;
  _isDirty = false;
  _ltr: any;

  editorPanel: HTMLDivElement | null;
  editor: HTMLTextAreaElement | null;
  preview: HTMLDivElement | null;
  resizebar: HTMLAnchorElement | null;

  linkRef: Form;

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
        link: false
      }
    };
  }

  componentDidMount () {
    // cache dom node
    this.textControl = this.editor;
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
    this.textControl.addEventListener('keydown', this._bindKey);
    this.textControl.addEventListener('paste', this._bindPaste.bind(this));
    this.textControl.addEventListener('scroll', this._syncScroll, false);
    this.previewControl.addEventListener('scroll', this._syncScroll, false);
    this._bindMouse();
    // this.listen(ModalStore, () => this.textControl.focus(), 'removeModal');
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
    this._uploadImage.call(this, data, {type: 'image'});
  }

  _bindMouse() {
    const panel = this.editorPanel;
    const resizebar = this.resizebar;

    (resizebar as HTMLAnchorElement).addEventListener('mousedown', function resizeStart(e: MouseEvent) {
      e.preventDefault();

      const start = e.pageY, oHeight = (panel as HTMLElement).clientHeight;
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
      keys[key]();
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

      console.log('Received values of form: ', values);
      this.setState({linkText: values.linkText, linkUrl: values.linkUrl});

      if (values.innerLinkUrl || values.innerLinkText) {
        values.linkUrl = values.innerLinkUrl;
        values.linkText = values.innerLinkText;
      }

      if (values.linkUrl && values.linkText) {
        this._linkText(values.linkUrl, values.linkText, false);
      } else {
        this._linkText();
      }

      (form as WrappedFormUtils).resetFields();
      this.setState({ visible: Object.assign({}, this.state.visible, {link: false}) });
    });
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
                ref={textarea => this.editor = textarea}
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
    const start = this.textControl.selectionStart;
    const end = this.textControl.selectionEnd;
    if (start === end) {
      return true;
    }

    let text = this.props.content;
    text = text.slice(0, start) + text.slice(end);
    this.setState({ result: marked(text) });
    this.props.onChange(text);

    return start;
  }

  // default text processors
  _preInputText (text: string, preStart: any, preEnd: any, selectStart?: any) {
    const start = selectStart || this.textControl.selectionStart;
    const end = selectStart || this.textControl.selectionEnd;
    const origin = this.props.content;

    if (start !== end) {
      const exist = origin.slice(start, end);
      text = text.slice(0, preStart) + exist + text.slice(preEnd);
      preEnd = preStart + exist.length;
    }
    let content = origin.slice(0, start) + text + origin.slice(end);
    // pre-select
    setTimeout(() => this.textControl.setSelectionRange(start + preStart, start + preEnd), 20);
    this.setState({ result: marked(content) }); // change state
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
    let _linkText = this._linkText;
    this.setState({visible: Object.assign({}, this.state.visible, {link: true})});
    // ModalAction.confirm(
    //   '插入链接',
    //   <Tabs defaultActiveKey={1}>
    //     <Tab eventKey={1} title="插入外链">
    //       <div style={{margin: '20px 0'}}>
    //         <div className="form-group">
    //           <label className="control-label" style={{display: 'inline-block', lineHeight: '30px'}}>链接地址：</label>
    //           <div style={{display: 'inline-block', width: '80%'}}>
    //             <input type="text" className="form-control" onChange={e => this.setState({linkUrl: e.target.value})}/>
    //           </div>
    //         </div>
    //         <div className="form-group">
    //           <label className="control-label" style={{display: 'inline-block', lineHeight: '30px'}}>链接文本：</label>
    //           <div style={{display: 'inline-block', width: '80%'}}>
    //             <input type="text" className="form-control" onChange={e => this.setState({linkText: e.target.value})}/>
    //           </div>
    //         </div>
    //       </div>
    //     </Tab>
    //     <Tab eventKey={2} title="插入内链">
    //       <div style={{margin: '20px 0'}}>
    //         <div className="form-group">
    //           <label className="control-label" style={{display: 'inline-block', lineHeight: '30px'}}>链接地址：</label>
    //           <div style={{display: 'inline-block', width: '80%'}}>
    //             <Search onSelect={(val, opt) => {
    //                 document.getElementsByClassName('inner-link-text')[0].value = opt.props.children;
    //                 this.setState({linkUrl: `${location.origin}/post/${val}.html`, linkText: opt.props.children})
    //             }}/>
    //           </div>
    //         </div>
    //         <div className="form-group">
    //           <label className="control-label" style={{display: 'inline-block', lineHeight: '30px'}}>链接文本：</label>
    //           <div style={{display: 'inline-block', width: '80%'}}>
    //             <input type="text" className="form-control inner-link-text" onChange={e => this.setState({linkText: e.target.value})}/>
    //           </div>
    //         </div>
    //       </div>
    //     </Tab>
    //   </Tabs>,
    //   () => {
    //     if(this.state.linkUrl && this.state.linkText) {
    //       _linkText(this.state.linkUrl, this.state.linkText, false);
    //     } else {
    //       _linkText();
    //     }
    //   }
    // )
  }

  _pictureText () {
    // ModalAction.confirm(
    //   '插入图片',
    //   <Tabs defaultActiveKey={1}>
    //     <Tab eventKey={1} title="本地上传">
    //       <div style={{margin: '20px 0'}}>
    //         <input type="file" name="file" accept="image/*" onChange={e=> this.setState({file: e.target.files[0], fileUrl: null})} />
    //       </div>
    //     </Tab>
    //     <Tab eventKey={2} title="从网络上抓取">
    //       <div style={{margin: '20px 0'}}>
    //         <input type="text" name="url" className="form-control" onChange={e=> this.setState({fileUrl: e.target.value, file: null})} />
    //       </div>
    //     </Tab>
    //   </Tabs>,
    //   () => {
    //     if(!this.state.file && !this.state.fileUrl) {
    //       return false;
    //     }

    //     var data = new FormData();
    //     if(this.state.fileUrl) {
    //       data.append('fileUrl', this.state.fileUrl);
    //     } else {
    //       if(this.state.file.size > 5 * 1024 * 1024) {
    //         return TipAction.fail('图片大小超过 5M！');
    //       }
    //       data.append('file', this.state.file);
    //     }

    //     this._uploadImage.call(this, data, {});
    //   }
    // );
  }

  // tslint:disable-next-line:typedef
  _uploadImage(data: any, {type = ''}) {
    this._preInputText('![图片上传中…]', 0, 9);
    return firekylin.upload(data).then((res: any) => {
      let start = this._cleanSelect();
      const reg = /^(https?:)?\/\/.+/;
      if (!reg.test(res.data)) {
        res.data = location.origin + res.data;
      }
      if (type.includes('image') || res.data.match(/\.(?:jpg|jpeg|png|bmp|gif|webp|svg|wmf|tiff|ico)$/i)) {
        this._preInputText(`![alt](${res.data})`, 2, 5, start);
      } else {
        let text = this.state.fileUrl ? '链接文本' : (this.state.file[0] as any).name;
        this._preInputText(`[${text}](${res.data})`, 1, text.length + 1, start);
      }
    }).catch((res) => {
      this._cleanSelect();
      // TipAction.fail(res.errmsg);
    });
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
