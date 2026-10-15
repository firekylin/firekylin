(function(global) {
  'use strict';

  var channel = 'firekylin:admin:v1';
  var token = new URLSearchParams(global.location.hash.slice(1)).get('firekylin-token');
  var sequence = 0;
  var pending = new Map();
  var contextResolve;
  var context = new Promise(function(resolve) { contextResolve = resolve; });

  function send(type, payload) {
    var id = String(++sequence);
    return new Promise(function(resolve, reject) {
      pending.set(id, {resolve: resolve, reject: reject});
      global.parent.postMessage(Object.assign({channel: channel, token: token,
        type: type, id: id}, payload || {}), '*');
    });
  }

  global.addEventListener('message', function(event) {
    if (event.source !== global.parent || !event.data || event.data.channel !== channel || event.data.token !== token) return;
    if (event.data.type === 'init') {
      var theme = event.data.context && event.data.context.theme;
      if (theme && theme.tokens) {
        Object.keys(theme.tokens).forEach(function(name) {
          document.documentElement.style.setProperty('--fk-' + name, theme.tokens[name]);
        });
        document.documentElement.dataset.theme = theme.mode;
      }
      contextResolve(event.data.context);
      return;
    }
    if (event.data.type !== 'response') return;
    var request = pending.get(String(event.data.id));
    if (!request) return;
    pending.delete(String(event.data.id));
    if (event.data.error) request.reject(new Error(event.data.error));
    else request.resolve(event.data.result);
  });

  global.FirekylinAdmin = Object.freeze({
    context: context,
    request: function(options) {
      options = options || {};
      return send('request', {method: options.method || 'GET', path: options.path, body: options.body});
    },
    navigate: function(path) { return send('navigate', {path: path}); },
    notify: function(message, level) { return send('notify', {message: message, level: level}); },
    confirm: function(message, title) { return send('confirm', {message: message, title: title}); },
    resize: function(height) { return send('resize', {height: height}); }
  });

  global.parent.postMessage({channel: channel, token: token, type: 'ready'}, '*');
})(window);
