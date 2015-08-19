import Reflux from 'reflux';
import md5 from 'md5';
import request from 'superagent';


let cache = {
  data: {},
  get(url) {
    return this.data[this.hash(url)] || null;
  },
  set(url, value) {
    this.data[this.hash(url)] = value;
  },
  clear(url) {
    this.set(url, null);
  },
  hash(url) {
    return md5(url);
  }
};

let buildCallback = function(action, url) {
  return function(error, response) {
    if (error || !response.ok) {
      action.failed(error || response.error);
    } else if (response.body.errno == 0) {
      action.completed(response.body, url);
    } else {
      action.failed(response.body.error);
      if (response.body.errno == 101) {
        UserActions.showLogin();
      }
    }
  };
};


export default function(url, Actions, ext = {}) {

  let methods = {};

  Actions.load && Object.assign(methods, {
    onLoad(useCache, id, param) {

      if (typeof useCache != 'boolean') {
        param = id;
        id = useCache;
        useCache = true;
      }

      let result;
      let url = this.getUrl(id, param);

      if (useCache && (result = cache.get(url))) {
        Actions.load.completed(result);
      } else {
        request
            .get(url)
            .end(buildCallback(Actions.load, url));
      }
    },
    onLoadCompleted(data, url) {
      cache.set(url, data);
    }
  });

  Actions.add && Object.assign(methods, {
      onAdd(data) {
        let url = this.getUrl();
        cache.clear(url);
        request
            .post(url)
            .type('form')
            .send(data)
            .end(buildCallback(Actions.add, url));
      }
  });

  Actions.update && Object.assign(methods, {
    onUpdate(id, data) {
      let url = this.getUrl(id);
      cache.clear(url);
      request
          .put(url)
          .type('form')
          .send(data)
          .end(buildCallback(Actions.update, url));
    }
  });

  Actions.delete && Object.assign(methods, {
    onDelete(id) {
      let url = this.getUrl(id);
      cache.clear(url);
      request
          .del(url)
          .end(buildCallback(Actions.delete, url));
    }
  });

  return Reflux.createStore(Object.assign({
    url: url,
    cache: cache,
    listenables: Actions,

    callback: buildCallback,

    state: {
      loading: false,
      response: null,
      error: null
    },

    init() {
      Object.keys(Actions)
          .filter(name => {
            let action = Actions[name];
            return action._isAction && action.completed && action.failed;
          })
          .forEach(name => {
            let action = Actions[name];
            this.listenTo(action, this.onStart.bind(this, name));
            this.listenTo(action.completed, this.onCompleted.bind(this, name));
            this.listenTo(action.failed, this.onFailed.bind(this, name));
          });
    },

    getUrl(id, param = {}) {
      let url = this.url;
      if (id) {
        url += '/' + id;
      } else if (Array.isArray(id) && id.every(Number.isInteger)) {
        url += '/' + id.join();
      }
      return url + '?' + Object.keys(param).map(key =>
          encodeURIComponent(key) + '=' + encodeURIComponent(param[key])
        ).join('&');
    },

    onStart(action) {
      this.state.loading = true;
      this.output(action);
    },

    onCompleted(action, response) {
      this.state.loading = false;
      this.state.response = response;
      this.output(action);
    },

    onFailed(action, error) {
      this.state.loading = false;
      this.state.error = error;
      this.output(action);
    },

    output(action) {
      let state = this.state;
      this.trigger({ action, ...state });
    }

  }, methods, ext));

};
