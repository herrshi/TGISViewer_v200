/**
 * Created by herrshi on 2017/6/19.
 */
define([
  "dojo/_base/html",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/i18n",
  "dojo/i18n!jimu/nls/main",
  "jimu/LayoutManager",
  "jimu/ConfigManager"
], function (
  html,
  lang,
  array,
  i18n,
  mainBundle,
  LayoutManager,
  ConfigManager
) {
  /* global jimuConfig:true */

  var mo = {}, appConfig;

  //jimu nls
  window.jimuNls = mainBundle;

  String.prototype.startWith = function(str) {
    if (this.substr(0, str.length) === str) {
      return true;
    } else {
      return false;
    }
  };

  String.prototype.endWith = function(str) {
    if (this.substr(this.length - str.length, str.length) === str) {
      return true;
    } else {
      return false;
    }
  };

  /*jshint unused: false*/
  if (typeof jimuConfig === "undefined") {
    jimuConfig = {};
  }
  jimuConfig = lang.mixin({
    loadingId: "main-loading",
    loadingImageId: "app-loading",
    loadingGifId: "loading-gif",
    layoutId: "jimu-layout-manager",
    mapId: "map",
    mainPageId: "main-page",
    timeout: 5000,
    breakPoints: [600, 1280]
  }, jimuConfig);

  function initApp() {
    var urlParams, configManager, layoutManager;
    console.log("jimu.js init...");

    html.setStyle(jimuConfig.loadingId, "display", "none");
    html.setStyle(jimuConfig.mainPageId, "display", "block");

    layoutManager = LayoutManager.getInstance({
      mapId: jimuConfig.mapId,
      urlParams: urlParams
    }, jimuConfig.layoutId);
    configManager = ConfigManager.getInstance(urlParams);

    layoutManager.startup();
    configManager.loadConfig();

    //load this module here to make load modules and load app parallelly
    require([window.path + "dynamic-modules/preload.js"]);
  }

  mo.initApp = initApp;
  return mo;
});
