import CodeMirror from 'codemirror';


var isMac = /Mac/.test(navigator.platform);

var shortcuts = {
  'Cmd-B': toggleBold,
  'Cmd-I': toggleItalic,
  'Cmd-K': drawLink,
  'Cmd-Alt-I': drawImage,
  "Cmd-'": toggleBlockquote,
  'Cmd-Alt-L': toggleOrderedList,
  'Cmd-L': toggleUnOrderedList
};

export {isMac, shortcuts};


/**
 * Fix shortcut. Mac use Command, others use Ctrl.
 */
export function fixShortcut(name) {
  if (isMac) {
    name = name.replace('Ctrl', 'Cmd');
  } else {
    name = name.replace('Cmd', 'Ctrl');
  }
  return name;
}


/**
 * Create icon element for toolbar.
 */
export function createIcon(name, options) {
  options = options || {};
  var el = document.createElement('a');

  var shortcut = options.shortcut || shortcuts[name];
  if (shortcut) {
    shortcut = fixShortcut(shortcut);
    el.title = shortcut;
    el.title = el.title.replace('Cmd', '⌘');
    if (isMac) {
      el.title = el.title.replace('Alt', '⌥');
    }
  }

  el.className = options.className || 'icon-' + name;
  return el;
}

export function createSep() {
  let el = document.createElement('i');
  el.className = 'separator';
  el.innerHTML = '|';
  return el;
}


/**
 * The state of CodeMirror at the given position.
 */
export function getState(cm, pos) {
  pos = pos || cm.getCursor('start');
  var stat = cm.getTokenAt(pos);
  if (!stat.type) return {};

  var types = stat.type.split(' ');

  var ret = {}, data, text;
  for (var i = 0; i < types.length; i++) {
    data = types[i];
    if (data === 'strong') {
      ret.bold = true;
    } else if (data === 'variable-2') {
      text = cm.getLine(pos.line);
      if (/^\s*\d+\.\s/.test(text)) {
        ret['ordered-list'] = true;
      } else {
        ret['unordered-list'] = true;
      }
    } else if (data === 'atom') {
      ret.quote = true;
    } else if (data === 'em') {
      ret.italic = true;
    }
  }
  return ret;
}


/**
 * Toggle full screen of the editor.
 */
export function toggleFullScreen(editor) {
  var el = editor.codemirror.getWrapperElement();

  // https://developer.mozilla.org/en-US/docs/DOM/Using_fullscreen_mode
  var doc = document;
  var isFull = doc.fullScreen || doc.mozFullScreen || doc.webkitFullScreen;
  var request = function() {
    if (el.requestFullScreen) {
      el.requestFullScreen();
    } else if (el.mozRequestFullScreen) {
      el.mozRequestFullScreen();
    } else if (el.webkitRequestFullScreen) {
      el.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  };
  var cancel = function() {
    if (doc.cancelFullScreen) {
      doc.cancelFullScreen();
    } else if (doc.mozCancelFullScreen) {
      doc.mozCancelFullScreen();
    } else if (doc.webkitCancelFullScreen) {
      doc.webkitCancelFullScreen();
    }
  };
  if (!isFull) {
    request();
  } else if (cancel) {
    cancel();
  }
}


/**
 * Action for toggling bold.
 */
export function toggleBold(editor) {
  _toggleBlock(editor, 'bold', '**');
}


/**
 * Action for toggling italic.
 */
export function toggleItalic(editor) {
  _toggleBlock(editor, 'italic', '*');
}

/**
 * Action for toggling code block.
 */
export function toggleCodeBlock(editor) {
  _toggleBlock(editor, 'code', '```\r\n', '\r\n```');
}

/**
 * Action for toggling blockquote.
 */
export function toggleBlockquote(editor) {
  var cm = editor.codemirror;
  _toggleLine(cm, 'quote');
}



/**
 * Action for toggling ul.
 */
export function toggleUnOrderedList(editor) {
  var cm = editor.codemirror;
  _toggleLine(cm, 'unordered-list');
}


/**
 * Action for toggling ol.
 */
export function toggleOrderedList(editor) {
  var cm = editor.codemirror;
  _toggleLine(cm, 'ordered-list');
}


/**
 * Action for drawing a link.
 */
export function drawLink(editor) {
  var cm = editor.codemirror;
  var stat = getState(cm);
  _replaceSelection(cm, stat.link, '[', '](http://)');
}


/**
 * Action for drawing an img.
 */

export function drawImage(editor) {
  
  var imgInput = document.getElementById('imgInput');
  imgInput.addEventListener('change',readFile,false); 

  function readFile() {
    var self = this;
    var file = this.files[0];

    this.getConfig = function(name){
      return config[name];
    };

    if(!/image\/\w+/.test(file.type)){ 
        alert("文件必须为图片！"); 
        return false; 
    } 
    var reader = new FileReader();
    reader.readAsDataURL(file); 
    reader.onload = function(e) { 
      upload(file, callback);
    }
  }

  function callback(url) {
    var cm = editor.codemirror;
    var stat = getState(cm);
    imgInput.removeEventListener('change',readFile,false); 
    _replaceSelection(cm, stat.image, '![', '](http://'+url+')');
    imgInput.value = "";
  }

}
/**
 * upload.
 */
export function upload(file, callback){
    try{
      var that = this;
      var fd = new FormData();
      fd.append('image',file);
          var uploadXhr = new XMLHttpRequest();
          // uploadXhr.upload.addEventListener("progress", function(evt){
          //   if(evt.lengthComputable){
          //     var file = that.info.queue[0];
          //     var loaded = evt.loaded;
          //     if(loaded>file.file.size)
          //       loaded = file.file.size;
          //       that.uploadProgress(file.id, loaded, evt.total);
          //   }
          // }, false);
          uploadXhr.addEventListener("load", function(evt, isError){
            if(!isError){
                var result = JSON.parse(evt.target.responseText);
                callback && callback(result.data.path)
                //that.autoCommit(result);
                /*
                  file = that.info.queue[0];
                that.uploadSuccess(file.id, file.name, false, 0, file.file.size, evt.target.responseText)
                //yunpan.upload.uploadSuccess(file, result); */     
            }else{
              that.uploadError(that.info.queue[0], '对不起，上传失败！');
            }
          
            uploadXhr = null;
          }, false);
          uploadXhr.addEventListener("error", function(evt){
            that.uploadError(that.info.queue[0], '对不起，上传失败！');
            uploadXhr = null;
          }, false);

          var uploadUrl = '/admin/api/upload';
          uploadXhr.open("POST", uploadUrl);
          uploadXhr.send(fd);
      }catch(e){
        throw new Error('YP:upload, ajax jxStartUpload. '+e.message);
      }
}

/**
 * Undo action.
 */
export function undo(editor) {
  var cm = editor.codemirror;
  cm.undo();
  cm.focus();
}


/**
 * Redo action.
 */
export function redo(editor) {
  var cm = editor.codemirror;
  cm.redo();
  cm.focus();
}

/**
 * Preview action.
 */
export function togglePreview(editor) {
  var toolbar = editor.toolbar.preview;
  var parse = editor.constructor.markdown;
  var cm = editor.codemirror;
  var wrapper = cm.getWrapperElement();
  var preview = wrapper.lastChild;
  if (!/editor-preview/.test(preview.className)) {
    preview = document.createElement('div');
    preview.className = 'editor-preview';
    wrapper.appendChild(preview);
  }
  if (/editor-preview-active/.test(preview.className)) {
    preview.className = preview.className.replace(
        /\s*editor-preview-active\s*/g, ''
    );
    toolbar.className = toolbar.className.replace(/\s*active\s*/g, '');
  } else {
    /* When the preview button is clicked for the first time,
     * give some time for the transition from editor.css to fire and the view to slide from right to left,
     * instead of just appearing.
     */
    setTimeout(function() {preview.className += ' editor-preview-active'}, 1);
    toolbar.className += ' active';
  }
  var text = cm.getValue();
  preview.innerHTML = parse(text);
}

function _replaceSelection(cm, active, start, end) {
  var text;
  var startPoint = cm.getCursor('start');
  var endPoint = cm.getCursor('end');
  if (active) {
    text = cm.getLine(startPoint.line);
    start = text.slice(0, startPoint.ch);
    end = text.slice(startPoint.ch);
    cm.setLine(startPoint.line, start + end);
  } else {
    text = cm.getSelection();
    cm.replaceSelection(start + text + end);

    startPoint.ch += start.length;
    endPoint.ch += start.length;
  }
  cm.setSelection(startPoint, endPoint);
  cm.focus();
}


function _toggleLine(cm, name) {
  var stat = getState(cm);
  var startPoint = cm.getCursor('start');
  var endPoint = cm.getCursor('end');
  var repl = {
    quote: /^(\s*)\>\s+/,
    'unordered-list': /^(\s*)(\*|\-|\+)\s+/,
    'ordered-list': /^(\s*)\d+\.\s+/
  };
  var map = {
    quote: '> ',
    'unordered-list': '* ',
    'ordered-list': '1. '
  };
  for (var i = startPoint.line; i <= endPoint.line; i++) {
    (function(i) {
      var text = cm.getLine(i);
      if (stat[name]) {
        text = text.replace(repl[name], '$1');
      } else {
        text = map[name] + text;
      }
      cm.setLine(i, text);
    })(i);
  }
  cm.focus();
}

function _toggleBlock(editor, type, start_chars, end_chars){
  end_chars = (typeof end_chars === 'undefined') ? start_chars : end_chars;
  var cm = editor.codemirror;
  var stat = getState(cm);

  var text;
  var start = start_chars;
  var end = end_chars;

  var startPoint = cm.getCursor('start');
  var endPoint = cm.getCursor('end');
  var startRegex, endRegex;

  if (stat[type]) {
    text = cm.getLine(startPoint.line);
    start = text.slice(0, startPoint.ch);
    end = text.slice(startPoint.ch);
    startRegex = new RegExp(`^(.*)(\\*|_){${start_chars.length}}(.*)?$`, "g");
    start = start.replace(startRegex, '$1$3');
    endRegex = new RegExp(`^(.*)(\\*|_){${end_chars.length}}(.*)?$`, "g");
    end = end.replace(endRegex, '$1$3');
    startPoint.ch -= start_chars.length;
    endPoint.ch -= end_chars.length;
    let lineStart = CodeMirror.Pos(startPoint.line, 0);
    let lineEnd = CodeMirror.Pos(startPoint.line, Infinity);

    cm.replaceRange(start + end, lineStart, lineEnd);
    //cm.setLine(startPoint.line, start + end);
  } else {
    text = cm.getSelection();
    cm.replaceSelection(start + text + end);

    startPoint.ch += start_chars.length;
    endPoint.ch += end_chars.length;
  }
  cm.setSelection(startPoint, endPoint);
  cm.focus();
}


/* The right word count in respect for CJK. */
export function wordCount(data) {
  var pattern = /[a-zA-Z0-9_\u0392-\u03c9]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af]+/g;
  var m = data.match(pattern);
  var count = 0;
  if( m === null ) return count;
  for (var i = 0; i < m.length; i++) {
    if (m[i].charCodeAt(0) >= 0x4E00) {
      count += m[i].length;
    } else {
      count += 1;
    }
  }
  return count;
}