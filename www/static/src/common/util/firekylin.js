//import {Promise} from 'es6-promise';
import moment from 'moment';
import TipActions from '../action/tip';

let toString = Object.prototype.toString;
let pSlice = Array.prototype.slice;

let firekylin = {
  /**
   * 获取deferred对象
   * @return {[type]} [description]
   */
  defer(){
    let deferred = {};
    deferred.promise = new Promise((resolve, reject) => {
      deferred.resolve = resolve;
      deferred.reject = reject;
    });
    return deferred;
  },
  /**
   * 处理请求，自动处理出错的情况
   * @param  {[type]} request [description]
   * @return {[type]}         [description]
   */
  request: request => {
    let deferred = firekylin.defer();
    if(request.method === 'POST') {
      request.type('form').send({web_token: SysConfig.token});
    }
    request.query({ _r: Math.random() });
    request.end((err, res) => {
      if(err){
        if(navigator.onLine) {
          TipActions.fail(err.message);
        } else {
          TipActions.fail('网络连接失败，请检查网络连接');
        }
        return deferred.reject(err);
      }
      let text = res.text.trim();
      try{
        text = JSON.parse(text);
        if(text.errno !== 0){
          TipActions.fail(text.errmsg);
          return deferred.reject(new Error(text.errmsg));
        }
        deferred.resolve(text.data || {});
      }catch(err){
        TipActions.fail(err.message);
        return deferred.reject(err);
      }
    });
    return deferred.promise;
  },
  upload: (data, url = '/admin/api/file') => {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.onload = function() {
        let res = JSON.parse(xhr.responseText);
        if(res.errno != 0) {
          reject(res);
        } else {
          resolve(res);
        }

      }
      xhr.onerror = function() {
        reject(xhr);
      }
      xhr.send(data);
    });
  },
  /**
   * check object is object
   * @param  {Mixed}  obj []
   * @return {Boolean}     []
   */
  isObject: obj => {
    return toString.call(obj) === '[object Object]';
  },
  /**
   * check object is string
   * @param  {Mixed}  obj []
   * @return {Boolean}     []
   */
  isString: obj => {
    return toString.call(obj) === '[object String]';
  },
  /**
   * check object is number
   * @param  {Mixed}  obj []
   * @return {Boolean}     []
   */
  isNumber: obj => {
    return toString.call(obj) === '[object Number]';
  },
  /**
   * check object is boolean
   * @param  {Mixed}  obj []
   * @return {Boolean}     []
   */
  isBoolean: obj => {
    return toString.call(obj) === '[object Boolean]';
  },
  /**
   * check object is array
   * @param  {Mixed}  obj []
   * @return {Boolean}     []
   */
  isArray: obj => {
    return toString.call(obj) === '[object Array]';
  },
  isDate: obj => {
    return toString.call(obj) === '[object Date]';
  },
  isRegExp: obj => {
    return toString.call(obj) === '[object RegExp]';
  },
  isNullOrUndefined: obj => {
    return obj === null || obj === undefined;
  },
  isArguments: obj => {
    return toString.call(obj) === '[object Arguments]';
  },
  /**
   * check object is mepty
   * @param  {[Mixed]}  obj []
   * @return {Boolean}     []
   */
  isEmpty: obj => {
    if (firekylin.isObject(obj)) {
      for(let key in obj){
        return !key && !0;
      }
      return true;
    }else if (firekylin.isArray(obj)) {
      return obj.length === 0;
    }else if (firekylin.isString(obj)) {
      return obj.length === 0;
    }else if (firekylin.isNumber(obj)) {
      return obj === 0;
    }else if (obj === null || obj === undefined) {
      return true;
    }else if (firekylin.isBoolean(obj)) {
      return !obj;
    }
    return false;
  },
  isPrimitive: arg => {
    return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
  },
  extend: (target, ...args) => {
    target = target || {};
    let i = 0, length = args.length, options, name, src, copy;
    for(; i < length; i++){
      options = args[i];
      if (!options) {
        continue;
      }
      for(name in options){
        src = target[name];
        copy = options[name];
        if (src && src === copy) {
          continue;
        }
        if(firekylin.isObject(copy)){
          target[name] = firekylin.extend(src && firekylin.isObject(src) ? src : {}, copy);
        }else if(firekylin.isArray(copy)){
          target[name] = firekylin.extend([], copy);
        }else{
          target[name] = copy;
        }
      }
    }
    return target;
  },
  deepEqual: (actual, expected) => {

    function objEquiv(a, b) {
      if (firekylin.isNullOrUndefined(a) || firekylin.isNullOrUndefined(b))
        return false;
      // an identical 'prototype' property.
      if (a.prototype !== b.prototype) return false;
      // if one is a primitive, the other must be same
      if (firekylin.isPrimitive(a) || firekylin.isPrimitive(b))
        return a === b;
      var aIsArgs = firekylin.isArguments(a),
          bIsArgs = firekylin.isArguments(b);
      if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
        return false;
      if (aIsArgs) {
        a = pSlice.call(a);
        b = pSlice.call(b);
        return firekylin.deepEqual(a, b);
      }
      var ka = Object.keys(a),
          kb = Object.keys(b),
          key, i;
      // having the same number of owned properties (keys incorporates
      // hasOwnProperty)
      if (ka.length != kb.length)
        return false;
      //the same set of keys (although not necessarily the same order),
      ka.sort();
      kb.sort();
      //~~~cheap key test
      for (i = ka.length - 1; i >= 0; i--) {
        if (ka[i] != kb[i])
          return false;
      }
      //equivalent values for every corresponding key, and
      //~~~possibly expensive deep test
      for (i = ka.length - 1; i >= 0; i--) {
        key = ka[i];
        if (!firekylin.deepEqual(a[key], b[key])) return false;
      }
      return true;
    }


    // 7.1. All identical values are equivalent, as determined by ===.
    if (actual === expected) {
      return true;

    } else if (firekylin.isDate(actual) && firekylin.isDate(expected)) {
      return actual.getTime() === expected.getTime();

    // 7.3 If the expected value is a RegExp object, the actual value is
    // equivalent if it is also a RegExp object with the same source and
    // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
    } else if (firekylin.isRegExp(actual) && firekylin.isRegExp(expected)) {
      return actual.source === expected.source &&
             actual.global === expected.global &&
             actual.multiline === expected.multiline &&
             actual.lastIndex === expected.lastIndex &&
             actual.ignoreCase === expected.ignoreCase;

    // 7.4. Other pairs that do not both pass typeof value == 'object',
    // equivalence is determined by ==.
    }
    else if(firekylin.isArray(actual) && firekylin.isArray(expected)){
      return objEquiv(actual, expected);
    }
    else if (!firekylin.isObject(actual) && !firekylin.isObject(expected)) {
      return actual == expected;

    // 7.5 For all other Object pairs, including Array objects, equivalence is
    // determined by having the same number of owned properties (as verified
    // with Object.prototype.hasOwnProperty.call), the same set of keys
    // (although not necessarily the same order), equivalent values for every
    // corresponding key, and an identical 'prototype' property. Note: this
    // accounts for both named and indexed properties on Arrays.
    } else {
      return objEquiv(actual, expected);
    }
  },

  formatTime(str) {
    return str ? moment(new Date(str)).format("YYYY年MM月DD日 HH:mm") : '';
  }
};

export default firekylin;
