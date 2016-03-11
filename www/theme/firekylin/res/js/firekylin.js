(function(win, doc){
  var getById = function(el){
    return document.getElementById(el);
  };

  //from qwrap
  var getDocRect = function(doc) {
    doc = doc || document;
    var win = doc.defaultView || doc.parentWindow,
      mode = doc.compatMode,
      root = doc.documentElement,
      h = win.innerHeight || 0,
      w = win.innerWidth || 0,
      scrollX = win.pageXOffset || 0,
      scrollY = win.pageYOffset || 0,
      scrollW = root.scrollWidth,
      scrollH = root.scrollHeight;
    if (mode != 'CSS1Compat') { // Quirks
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
    var doc = node.ownerDocument,
      docRect = getDocRect(doc),
      scrollLeft = docRect.scrollX,
      scrollTop = docRect.scrollY,
      box = node.getBoundingClientRect(),
      xy = [box.left, box.top],
      mode,
      off1,
      off2;
    if (scrollTop || scrollLeft) {
      xy[0] += scrollLeft;
      xy[1] += scrollTop;
    }
    return xy;
  };

  var getRect = function(el){
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

  /**
   * load comment
   * @return {[type]} [description]
   */
  var loadComment = function(){
    var comments = getById('comments');
    if(!comments){
      return;
    }
    var load = function(){
      var dataType = comments.getAttribute('data-type');
      if(dataType === 'disqus'){
        loadDisqusComment();
      }else if(dataType === 'duoshuo'){
        loadDuoshuoComment();
      }
    }
    if(location.hash.indexOf('#comments') > -1){
      load();
    }else {
      var timer = setInterval(function(){
        var docRect = getDocRect();
        var currentTop = docRect.scrollY + docRect.height;
        var elTop = getRect(comments).top;
        if(Math.abs(elTop - currentTop) < 1000){
          load();
          clearInterval(timer);
        }
      }, 300)
    }
  };
  /**
   * load disqus comment
   * @return {[type]} [description]
   */
  var loadDisqusComment = function(){
    var disqus_thread = getById('disqus_thread');
    if(!disqus_thread){
      return;
    }
    window.disqus_config = function(){
      this.page.url = disqus_thread.getAttribute('data-url');
      this.page.identifier = disqus_thread.getAttribute('data-identifier'); 
    }
    var s = doc.createElement('script');
    s.src = '//' + disqus_thread.getAttribute('data-name') + '.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (doc.head || doc.body).appendChild(s);
  };

  var loadDuoshuoComment = function(){
    var disqus_thread = getById('ds_thread');
    if(!disqus_thread){
      return;
    }
    window.duoshuoQuery = {short_name: disqus_thread.getAttribute('data-name')};
    var s = document.createElement('script');
    s.src = '//static.duoshuo.com/embed.js';
    (doc.head || doc.body).appendChild(s);
  };

  window.addEventListener('load', function(){
    loadComment();
  });





  var utils = {
    isMob : (function(){
      var ua = navigator.userAgent.toLowerCase();
      var agents = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod"];
      var result = false;
      for( var i = 0 ; i < agents.length; i++ ){
        if( ua.indexOf( agents[i].toLowerCase() ) > -1){
          result = true;
        }
      }
      return result;
    })()
  }


  if( utils.isMob ){
    document.documentElement.className += ' mob';
  }else{
    document.documentElement.className += ' pc';
  }


  var Dom = {
    $sidebar : document.querySelector('#sidebar'),
    $main : document.querySelector('#main'),
    $sidebar_mask : document.querySelector('#sidebar-mask'),
    $body : document.body,
    $btn_side : document.querySelector('#header .btn-bar'),
    $article : document.querySelectorAll('.mob #page-index article')
  };

  Dom.bindEvent = function(){

    var _this = this,
      body_class_name = 'side',
      eventFirst = 'click',
      eventSecond = 'click';

    if( utils.isMob ){
      eventFirst = 'touchstart';
      eventSecond = 'touchend';
    }


    for( var i = 0 ; i < this.$article.length; i++ ){
      this.$article[i].addEventListener( 'click' , function(){
        var url = this.getAttribute('data-url');
        window.location.href = url ;
      },false);
    }


    this.$btn_side.addEventListener( eventSecond ,function(){

      if( _this.$body.className.indexOf( body_class_name ) > -1 ){
        _this.$body.className = _this.$body.className.replace( body_class_name , '');
        _this.$sidebar_mask.style.display = 'none';
      }else{
        _this.$body.className += (' ' + body_class_name);
        _this.$sidebar_mask.style.display = 'block';
      }

    },false);

    this.$sidebar_mask.addEventListener( eventFirst , function( e ){
      _this.$body.className = _this.$body.className.replace( body_class_name , '');
      _this.$sidebar_mask.style.display = 'none';
      e.preventDefault();
    },false);

    
    window.addEventListener('resize',function(){
      _this.$body.className = _this.$body.className.replace( body_class_name , '');
      _this.$sidebar_mask.style.display = 'none';
    },false);
  }

  Dom.bindEvent();

})(window, document);
