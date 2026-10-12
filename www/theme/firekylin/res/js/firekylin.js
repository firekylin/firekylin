(function(win, doc) {
  // from qwrap
  var getDocRect = function(doc) {
    doc = doc || document;
    var win = doc.defaultView || doc.parentWindow;
    var mode = doc.compatMode;
    var root = doc.documentElement;
    var h = win.innerHeight || 0;
    var w = win.innerWidth || 0;
    var scrollX = win.pageXOffset || 0;
    var scrollY = win.pageYOffset || 0;
    var scrollW = root.scrollWidth;
    var scrollH = root.scrollHeight;
    if (mode !== 'CSS1Compat') { // Quirks
      root = doc.body;
      scrollW = root.scrollWidth;
      scrollH = root.scrollHeight;
    }
    if (mode) { // IE, Gecko
      w = root.clientWidth;
      h = root.clientHeight;
    }
    scrollW = Math.max(scrollW, w);
    scrollH = Math.max(scrollH, h);
    scrollX = Math.max(scrollX, doc.documentElement.scrollLeft, doc.body.scrollLeft);
    scrollY = Math.max(scrollY, doc.documentElement.scrollTop, doc.body.scrollTop);
    return {
      width: w,
      height: h,
      scrollWidth: scrollW,
      scrollHeight: scrollH,
      scrollX: scrollX,
      scrollY: scrollY
    };
  };

  var getXY = function(node) {
    var doc = node.ownerDocument;
    var docRect = getDocRect(doc);
    var scrollLeft = docRect.scrollX;
    var scrollTop = docRect.scrollY;
    var box = node.getBoundingClientRect();
    var xy = [box.left, box.top];
    if (scrollTop || scrollLeft) {
      xy[0] += scrollLeft;
      xy[1] += scrollTop;
    }
    return xy;
  };

  var getRect = function(el) {
    var p = getXY(el);
    var x = p[0];
    var y = p[1];
    var w = el.offsetWidth;
    var h = el.offsetHeight;
    return {
      'width': w,
      'height': h,
      'left': x,
      'top': y,
      'bottom': y + h,
      'right': x + w
    };
  };

  var utils = {
    isMob: (function() {
      var ua = navigator.userAgent.toLowerCase();
      var agents = ['Android', 'iPhone', 'SymbianOS', 'Windows Phone', 'iPad', 'iPod'];
      var result = false;
      for (var i = 0; i < agents.length; i++) {
        if (ua.indexOf(agents[i].toLowerCase()) > -1) {
          result = true;
        }
      }
      return result;
    })()
  };

  if (utils.isMob) {
    doc.documentElement.className += ' mob';
  } else {
    doc.documentElement.className += ' pc';
  }

  var Dom = {
    $sidebar: doc.querySelector('#sidebar'),
    $main: doc.querySelector('#main'),
    $sidebar_mask: doc.querySelector('#sidebar-mask'),
    $body: doc.body,
    $btn_side: doc.querySelector('#header .btn-bar'),
    $article: doc.querySelectorAll('.mob #page-index article')
  };

  Dom.bindEvent = function() {
    var _this = this;
    var body_class_name = 'side';
    var eventFirst = 'click';
    var eventSecond = 'click';

    if (utils.isMob) {
      eventFirst = 'touchstart';
      eventSecond = 'touchend';
    }

    this.$btn_side.addEventListener(eventSecond, function() {
      if (_this.$body.className.indexOf(body_class_name) > -1) {
        _this.$body.className = _this.$body.className.replace(body_class_name, '');
        _this.$sidebar_mask.style.display = 'none';
      } else {
        _this.$body.className += (' ' + body_class_name);
        _this.$sidebar_mask.style.display = 'block';
      }
    }, false);

    this.$sidebar_mask.addEventListener(eventFirst, function(e) {
      _this.$body.className = _this.$body.className.replace(body_class_name, '');
      _this.$sidebar_mask.style.display = 'none';
      e.preventDefault();
    }, false);

    win.addEventListener('resize', function() {
      _this.$body.className = _this.$body.className.replace(body_class_name, '');
      _this.$sidebar_mask.style.display = 'none';
    }, false);
  };

  Dom.bindEvent();

  /**
   *  Image Lazy Load
   */
  win.addEventListener('load', lazyLoad);
  win.addEventListener('scroll', lazyLoad);
  win.addEventListener('resize', lazyLoad);

  function lazyLoad() {
    var lazyLoadImages = doc.getElementsByClassName('lazy-load');

    if (lazyLoadImages.length === 0) {
      win.removeEventListener('load', lazyLoad);
      win.removeEventListener('scroll', lazyLoad);
      win.removeEventListener('resize', lazyLoad);
    } else {
      for (var i = lazyLoadImages.length - 1; i > -1; i--) {
        var img = lazyLoadImages[i];
        if (lazyLoadShouldAppear(img, 300)) {
          img.src = img.getAttribute('data-src');
          img.removeAttribute('data-src');
          img.classList.remove('lazy-load');
        }
      }
    }
  }

  function lazyLoadShouldAppear(el, buffer) {
    return el.offsetTop - (
      (doc.scrollingElement || doc.documentElement).scrollTop + (win.innerHeight || doc.documentElement.clientHeight)
    ) < buffer;
  }

  // 行号和高亮行处理 @xuexb
  var hljs = {
    $code: doc.querySelectorAll('pre code'),
    hasClass: function(ele, cls) {
      return ele.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));
    },
    addClass: function(ele, cls) {
      if (!hljs.hasClass(ele, cls)) {
        ele.className += ' ' + cls;
      }
    },
    removeClass: function(ele, cls) {
      if (hljs.hasClass(ele, cls)) {
        ele.className = ele.className.replace(new RegExp('(\\s|^)' + cls + '(\\s|$)'), ' ');
      }
    }
  };

  /**
   * 使用数据生成hash
   *
   * @param  {Object} data 数据
   * @param {number} data.index 代码块位置, 以1开始
   * @param {number} data.start 行号开始
   * @param {number} data.end 行号结束
   *
   * @return {string}
   */
  hljs.stringHash = function(data) {
    var hash = '';
    if (data.index > 1) {
      hash += data.index + '-';
    }
    hash += 'L' + data.start;
    if (data.end && data.end > data.start) {
      hash += '-' + 'L' + data.end;
    }
    return hash;
  };

  /**
   * 解析hash为数据
   *
   * @return {Object} {index: 当前代码块位置, 以1开始,  start: 行号开始,  end: 结束位置}
   */
  hljs.parseHash = function() {
    var parse = location.hash.substr(1).match(/((\d+)-)?L(\d+)(-L(\d+))?/);

    if (!parse) {
      return null;
    }

    return {
      index: parseInt(parse[2], 10) || 1,
      start: parseInt(parse[3], 10) || 1,
      end: parseInt(parse[5], 10) || parseInt(parse[3], 10) || 1
    };
  };

  /**
   * 标记行颜色并跳转
   */
  hljs.mark = function(go) {
    var hash = hljs.parseHash();
    if (!hash || !hljs.$code || !hljs.$code[hash.index - 1]) {
      return;
    }

    var $li = hljs.$code[hash.index - 1].querySelectorAll('li');
    for (var i = hash.start - 1; i < hash.end; i++) {
      if ($li[i]) {
        hljs.addClass($li[i], 'mark');
      }
    }

    // 如果需要定位且元素存在
    if (go && $li && $li[0]) {
      setTimeout(function() {
        window.scrollTo(0, getRect($li[0]).top - 50);
      });
    }
  };

  /**
   * 移除所有高亮行号
   */
  hljs.removeMark = function() {
    [].slice.call(doc.querySelectorAll('pre code li.mark')).forEach(function(elem) {
      hljs.removeClass(elem, 'mark');
    });
  };

  /**
   * 初始化
   */
  hljs.init = function() {
    [].slice.call(hljs.$code).forEach(function(elem, i) {
      var lines = elem.innerHTML.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
      var html = lines.map(function(item, index) {
        return '<li><span class="line-num" data-line="' + (index + 1) + '"></span>' + item + '</li>';
      }).join('');
      html = '<ul>' + html + '</ul>';

      // 输出语言
      if (lines.length > 3 && elem.className.match(/lang-(\w+)/) && RegExp.$1 !== 'undefined') {
        html += '<b class="name">' + RegExp.$1 + '</b>';
      }

      elem.innerHTML = html;

      hljs.addClass(elem, 'firekylin-code');

      // 绑定点击高亮行事件
      elem.addEventListener('click', function(event) {
        // 小小的委托
        if (!event.target || !hljs.hasClass(event.target, 'line-num')) {
          return;
        }

        // 如果是区间
        if (event.shiftKey) {
          var hash = hljs.parseHash();
          hash.newIndex = i + 1;
          hash.current = event.target.getAttribute('data-line');
          if (hash.index !== hash.newIndex - 0) {
            hash.index = hash.newIndex;
            hash.start = hash.current;
            hash.end = 0;
          } else {
            if (hash.current > hash.start) {
              hash.end = hash.current;
            } else {
              hash.end = hash.start;
              hash.start = hash.current;
            }
          }
          location.hash = hljs.stringHash(hash);
        } else {
          location.hash = hljs.stringHash({
            index: i + 1,
            start: event.target.getAttribute('data-line')
          });
        }
      });
    });
  };

  hljs.init();
  win.addEventListener('load', function() {
    hljs.mark(true);
  });
  win.addEventListener('hashchange', function() {
    hljs.removeMark();
    hljs.mark();
  });
})(window, document);
