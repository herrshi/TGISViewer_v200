/**
 * Created by herrshi on 2017/6/16.
 */
var
  allCookies,
  appInfo = {},
  deployVersion = "2.4";


(function (global) {
  var queryObject = getQueryObject();
  allCookies = getAllCookies();

  global.avoidRequireCache = function(require){
    var dojoInject = require.injectUrl;
    require.injectUrl = function(url, callback, owner){
      url = appendDeployVersion(url);
      dojoInject(url, callback, owner);
    };
  };

  global.avoidRequestCache = function (aspect, requestUtil){
    aspect.after(requestUtil, "parseArgs", function(args){
      args.url = appendDeployVersion(args.url);
      return args;
    });
  };

  function appendDeployVersion(url){
    if(/^http(s)?:\/\//.test(url) || /^\/proxy\.js/.test(url) || /^\/\//.test(url)){
      return url;
    }
    if(url.indexOf("?") > -1){
      url = url + "&wab_dv=" + deployVersion;
    }else{
      url = url + "?wab_dv=" + deployVersion;
    }
    return url;
  }

  function getAllCookies(){
    var strAllCookie = document.cookie;
    var cookies = {};
    if (strAllCookie) {
      var strCookies = strAllCookie.split(";");
      for(var i = 0; i < strCookies.length; i++){
        var splits = strCookies[i].split("=");
        if(splits && splits.length > 1){
          cookies[splits[0].replace(/^\s+|\s+$/gm, "")] = splits[1];
        }
      }
    }
    return cookies;
  }

  function getPath() {
    var fullPath, path;

    fullPath = window.location.pathname;
    if (fullPath === "/" || fullPath.substr(fullPath.length - 1) === "/") {
      path = fullPath;
    }else{
      var sections = fullPath.split("/");
      var lastSection = sections.pop();
      if (/\.html$/.test(lastSection) || /\.aspx$/.test(lastSection) ||
        /\.jsp$/.test(lastSection) || /\.php$/.test(lastSection)) {
        //index.html may be renamed to index.jsp, etc.
        path = sections.join("/") + "/";
      } else {
        return false;
      }
    }
    return path;
  }

  function getQueryObject(){
    var query = window.location.search;
    if (query.indexOf("?") > -1) {
      query = query.substr(1);
    }
    var pairs = query.split("&");
    var queryObject = {};
    for(var i = 0; i < pairs.length; i++){
      var splits = decodeURIComponent(pairs[i]).split("=");
      queryObject[splits[0]] = splits[1];
    }
    return queryObject;
  }

  function _loadPolyfills(prePath, cb) {
    prePath = prePath || "";
    var ap = Array.prototype,
      fp = Function.prototype,
      sp = String.prototype,
      loaded = 0,
      completeCb = function() {
        loaded++;
        if (loaded === tests.length) {
          cb();
        }
      },
      tests = [{
        test: window.console,
        failure: prePath + "libs/polyfills/console.js",
        callback: completeCb
      }, {
        test: ap.indexOf && ap.lastIndexOf && ap.forEach && ap.every && ap.some &&
        ap.filter && ap.map && ap.reduce && ap.reduceRight,
        failure: prePath + "libs/polyfills/array.generics.js",
        callback: completeCb
      }, {
        test: fp.bind,
        failure: prePath + "libs/polyfills/bind.js",
        callback: completeCb
      }, {
        test: Date.now,
        failure: prePath + "libs/polyfills/now.js",
        callback: completeCb
      }, {
        test: sp.trim,
        failure: prePath + "libs/polyfills/trim.js",
        callback: completeCb
      }, {
        test: false,
        failure: prePath + "libs/polyfills/FileSaver.js",
        callback: completeCb
      }, {
        test: typeof Blob !== "undefined",
        failure: prePath + "libs/polyfills/FileSaver.ie9.js",
        callback: completeCb
      }, {
        test: window.Blob,
        failure: prePath + "libs/polyfills/Blob.js",
        callback: completeCb
      }, {
        test: window.ArrayBuffer,
        failure: prePath + "libs/polyfills/typedarray.js",
        callback: completeCb
      }];

    for(var i = 0; i < tests.length; i++){
      testLoad(tests[i]);
    }
  }

  global._loadPolyfills = _loadPolyfills;
  global.queryObject = queryObject;
})(window);
