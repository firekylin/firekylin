import React from 'react';
import classnames from 'classnames';
import Tree from 'react-ui-tree';
import CodeMirror from 'react-codemirror';
import BreadCrumb from './breadcrumb';
import Base from 'base';
import TipAction from 'common/action/tip';
import ModalAction from 'common/action/modal';
import ThemeStore from 'admin/store/theme';
import ThemeAction from 'admin/action/theme';

import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/mode/css/css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/htmlmixed/htmlmixed';


module.exports = class extends Base {
  state = this.initialState();

  initialState() {
    return {
      list: [],
      currentFile: '',
      content: '',
      theme: window.SysConfig.options.theme || 'firekylin'
    }
  }

  componentWillMount() {
    this.listenTo(ThemeStore, this.handleTrigger.bind(this));
    this.checkTheme();
    ThemeAction.getThemeFileList(this.state.theme);
  }

  handleTrigger(data, type) {
    switch (type) {
      case 'getThemeFileListSuccess':
        this.setState({list: this.initialFileList(data)});
        break;
      case 'getThemeFileSuccess':
        this.setState({content: data});
        break;
      case 'updateThemeFileSuccess':
        TipAction.success('保存成功');
        break;
      case 'forkThemeSuccess':
        TipAction.success('拷贝主题成功，你可以放心修改了！');
        setTimeout(() => location.reload(), 1000);
        break;
    }
  }

  checkTheme() {
    if(this.state.theme !== 'firekylin') {
      return true;
    }


    ModalAction.confirm(
      '主题修改警告！',
      <div>您当前使用的是默认主题，升级过程中很有可能会覆盖你的修改，是否需要拷贝默认主题为新的主题来避免这个问题？</div>,
      ()=> {
        ThemeAction.forkTheme('firekylin', 'firekylin_new');
      }
    );
  }

  /**
   * 为 child 添加 parent 的引用方便最后获取到文件的最终路径
   */
  initialFileList(data, parent = null) {
    return data.map((item) => {
      item.parent = parent;
      if(item.children) {
        item.collapsed = true;
        item.children = this.initialFileList(item.children, item);
      }

      /** 默认加载 package.json 文件 */
      if(item.module.toLowerCase() === 'package.json') {
        this.state.active = item;
        this.state.currentFile = this.state.theme + '/package.json';
        ThemeAction.getThemeFile(this.state.currentFile);
      }

      return item;
    });
  }

  getThemeFile(node) {
    let filePath = '';
    do {
      filePath = node.module + (!filePath ? '' : '/' + filePath);
      node = node.parent;
    } while(node);

    this.state.currentFile = this.state.theme + '/' + filePath;
    ThemeAction.getThemeFile(this.state.currentFile);
  }

  toggleFile(node) {
    if(node.hasOwnProperty('children')) {
      node.collapsed = !node.collapsed;
      return this.forceUpdate();
    }

    this.setState({active: node});
    this.getThemeFile(node);
  }

  getEditorMode(ext) {
    switch(ext.toLowerCase()) {
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

  updateThemeFile() {
    let filePath = this.state.currentFile;
    let content = this.state.content;
    if(!filePath) {
      return true;
    }

    ThemeAction.updateThemeFile(filePath, content);
  }

  render() {
    // TreeTheme.tree.base.backgroundColor = 'transparent';
    // TreeTheme.tree.node.activeLink.background = '#eee';
    let tree = {module: this.state.theme, children: this.state.list};
    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <h3 style={{marginBottom: '20px'}}>编辑当前主题({this.state.theme})</h3>
          <div className="row">
            <div className="col-xs-9 theme-editor">
              <CodeMirror
                  options={{
                    theme: 'monokai',
                    lineNumbers: true,
                    mode: this.getEditorMode(this.state.currentFile.split('.').pop())
                  }}
                  value={this.state.content}
                  onChange={content => this.setState({content})}
              />
              <div className="text-right" style={{marginTop: 15}}>
                <button className="btn btn-primary" onClick={this.updateThemeFile.bind(this)}>保存</button>
              </div>
            </div>
            <div className="col-xs-3">
              <Tree
                tree={tree}
                renderNode={node =>
                  <span
                      className={classnames('node', {'is-active': node===this.state.active})}
                      onClick={this.toggleFile.bind(this, node)}
                  >
                    {node.module}
                  </span>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
