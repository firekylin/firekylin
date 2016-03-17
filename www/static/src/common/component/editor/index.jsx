import React, { PropTypes as T } from 'react';
import ReactDOM from 'react-dom';
import marked from 'marked';
import classnames from 'classnames';
import {Tabs, Tab} from 'react-bootstrap';
import ModalAction from 'common/action/modal';
import firekylin from 'common/util/firekylin';
import './style.css';

import TipAction from 'common/action/tip';

const MdEditor = React.createClass({
  propTypes: {
    onFullScreen: T.func,
    content: T.string,
    children: T.node,
    info:T.object,
  },
  getInitialState () {
    return {
      panelClass: 'md-panel',
      mode: 'edit',
      isFullScreen: false,
      result: marked(this.props.content || '')
    }
  },
  componentDidMount () {
    // cache dom node
    this.textControl = ReactDOM.findDOMNode(this.refs.editor);
    this.previewControl = ReactDOM.findDOMNode(this.refs.preview);
    if(localStorage['unsavetype'+this.props.info.type+'id'+this.props.info.id+'']) {
        ModalAction.confirm('提示','检测到上次没有保存文章就退出页面，是否从缓存里恢复文章',()=>{
          this.textControl.value = localStorage['unsavetype'+this.props.info.type+'id'+this.props.info.id+''];
          this.setState({ result: marked(this.textControl.value) });
          this.props.onChange(this.textControl.value);
        })

    }
  },
  componentWillReceiveProps(nextProps) {
    if(nextProps.content === this.props.content) { return; }
    this.setState({result: marked(nextProps.content || '')});
  },
  componentWillUnmount () {
    this.textControl = null
    this.previewControl = null
  },
  render () {
    const panelClass = classnames([ 'md-panel', { 'fullscreen': this.state.isFullScreen } ])
    const editorClass = classnames([ 'md-editor', { 'expand': this.state.mode === 'edit' } ])
    const previewClass = classnames([ 'md-preview', 'markdown', { 'expand': this.state.mode === 'preview', 'shrink': this.state.mode === 'edit' } ])

    return (
      <div className={panelClass}>
        <div className="md-menubar">
          {this._getModeBar()}
          {this._getToolBar()}
        </div>
        <div className={editorClass}>
          <textarea ref="editor" name="content" onChange={this._onChange} value={this.props.content}></textarea>{/* style={{height: this.state.editorHeight + 'px'}} */}
        </div>
        <div className={previewClass} ref="preview" dangerouslySetInnerHTML={{ __html: this.state.result }}></div>
        <div className="md-spliter"></div>
      </div>
    )
  },
  // public methods
  isDirty () {
    return this._isDirty || false
  },
  getValue () {
    return this.state.content
  },
  // widgets constructors
  _getToolBar () {
    return (
      <ul className="md-toolbar clearfix">
        <li className="tb-btn"><a title="加粗" onClick={this._boldText}><i className="glyphicon glyphicon-bold" /></a></li>{/* bold */}
        <li className="tb-btn"><a title="斜体" onClick={this._italicText}><i className="glyphicon glyphicon-italic" /></a></li>{/* italic */}
        <li className="tb-btn spliter"></li>
        <li className="tb-btn"><a title="链接" onClick={this._linkText}><i className="glyphicon glyphicon-link" /></a></li>{/* link */}
        <li className="tb-btn"><a title="引用" onClick={this._blockquoteText}><i className="glyphicon glyphicon-comment" /></a></li>{/* blockquote */}
        <li className="tb-btn"><a title="代码段" onClick={this._codeText}><i className="glyphicon glyphicon-console" /></a></li>{/* code */}
        <li className="tb-btn"><a title="图片" onClick={this._pictureText}><i className="glyphicon glyphicon-picture" /></a></li>{/* picture-o */}
        <li className="tb-btn spliter"></li>
        <li className="tb-btn"><a title="有序列表" onClick={this._listOlText}><i className="glyphicon glyphicon-list-alt" /></a></li>{/* list-ol */}
        <li className="tb-btn"><a title="无序列表" onClick={this._listUlText}><i className="glyphicon glyphicon-list" /></a></li>{/* list-ul */}
        <li className="tb-btn"><a title="标题" onClick={this._headerText}><i className="glyphicon glyphicon-header" /></a></li>{/* header */}
        {this._getExternalBtn()}
      </ul>
    )
  },
  _getExternalBtn () {
    return React.Children.map(this.props.children, (option) => {
      if (option.type === 'option') {
        return <li className="tb-btn"><a {...option.props}>{option.props.children}</a></li>
      }
    })
  },
  _getModeBar () {
    const checkActive = (mode) => classnames({ active: this.state.mode === mode })

    return (
      <ul className="md-modebar">
        <li className="tb-btn pull-right">
          <a className={checkActive('preview')} onClick={this._changeMode('preview')} title="预览模式">
            <i className="glyphicon glyphicon-eye-open" />
          </a>
        </li> { /* preview mode */ }
        <li className="tb-btn pull-right">
          <a className={checkActive('split')} onClick={this._changeMode('split')} title="分屏模式">
            <i className="glyphicon glyphicon-adjust" />
          </a>
        </li> { /* split mode */ }
        <li className="tb-btn pull-right">
          <a className={checkActive('edit')} onClick={this._changeMode('edit')} title="编辑模式">
            <i className="glyphicon glyphicon-pencil" />
          </a>
        </li> { /* edit mode */ }
        <li className="tb-btn spliter pull-right"></li>
        <li className="tb-btn pull-right"><a title="全屏模式" onClick={this._toggleFullScreen}><i className="glyphicon glyphicon-fullscreen" /></a></li> {/* full-screen */}
      </ul>
    )
  },
  // event handlers
  _onChange (e) {
    console.log(this.state);
    this._isDirty = true // set dirty
    if (this._ltr) clearTimeout(this._ltr)

    this._ltr = setTimeout(() => {
      this.setState({ result: marked(this.textControl.value) }) // change state
      localStorage['unsavetype'+this.props.info.type+'id'+this.props.info.id+''] = this.textControl.value;
    }, 300);

    this.props.onChange(e.target.value);
  },
  _changeMode (mode) {
    return (e) => {
      this.setState({ mode })
    }
  },
  _toggleFullScreen (e) {
    this.setState({ isFullScreen: !this.state.isFullScreen }, () => this.props.onFullScreen(this.state.isFullScreen));
  },
  // default text processors
  _preInputText (text, preStart, preEnd) {
    const start = this.textControl.selectionStart
    const end = this.textControl.selectionEnd
    const origin = this.textControl.value

    if (start !== end) {
      const exist = origin.slice(start, end)
      text = text.slice(0, preStart) + exist + text.slice(preEnd)
      preEnd = preStart + exist.length
    }
    this.textControl.value = origin.slice(0, start) + text + origin.slice(end)
    // pre-select
    this.textControl.setSelectionRange(start + preStart, start + preEnd)
    this.setState({ result: marked(this.textControl.value) }) // change state
    this.props.onChange( this.textControl.value );
  },
  _boldText () {
    this._preInputText("**加粗文字**", 2, 6)
  },
  _italicText () {
    this._preInputText("_斜体文字_", 1, 5)
  },
  _linkText (url = 'www.yourlink.com') {
    this._preInputText(`[链接文本](${url})`, 1, 5)
  },
  _blockquoteText () {
    this._preInputText("> 引用", 2, 4)
  },
  _codeText () {
    this._preInputText("```\ncode block\n```", 4, 14)
  },
  _pictureText () {
    let preInputText = this._preInputText, that = this;
    ModalAction.confirm(
      '插入图片',
      <Tabs defaultActiveKey={1}>
        <Tab eventKey={1} title="本地上传">
          <div style={{margin: '20px 0'}}>
            <input type="file" name="file" onChange={e=> this.setState({file: e.target.files})} />
          </div>
        </Tab>
        <Tab eventKey={2} title="从网络上抓取">
          <input type="text" name="url" className="form-control" onChange={e=> this.setState({fileUrl: e.target.value})} />
        </Tab>
      </Tabs>,
      ()=> {
        if( (this.state.file && this.state.file.length === 0) && !this.state.fileUrl ) {
          return false;
        }

        var data = new FormData;
        if( this.state.fileUrl ) {
          data.append('fileUrl', this.state.fileUrl);
        } else {
          data.append('file', this.state.file[0]);
        }

        return firekylin.upload(data).then(
          res => {
            if( res.data.match(/\.(?:jpg|jpeg|png|bmp|gif|webp|svg|wmf|tiff|ico)$/i) ) {
              preInputText(`![alt](${res.data})`, 2, 5);
            } else {
              let text = that.state.fileUrl ? '链接文本' : that.state.file[0].name;
              preInputText(`[${text}](${res.data})`, 1, text.length + 1);
            }
          }
        ).catch((res)=> TipAction.fail(res.errmsg));
      }
    );
  },
  _listUlText () {
    this._preInputText("- 无序列表项0\n- 无序列表项1", 2, 8)
  },
  _listOlText () {
    this._preInputText("1. 有序列表项0\n2. 有序列表项1", 3, 9)
  },
  _headerText () {
    this._preInputText("## 标题", 3, 5)
  }
});

export default MdEditor
