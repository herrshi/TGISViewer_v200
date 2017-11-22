/**
 * Created by herrshi on 2017/6/19.
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/_base/html",
  "dojo/_base/config",
  "dojo/Deferred",
  "dojo/promise/all",
  "dojo/request/xhr",
  "jimu/WidgetManager",
  "jimu/utils"
], function (
  declare,
  lang,
  array,
  html,
  config,
  Deferred,
  all,
  xhr,
  WidgetManager,
  jimuUtils
) {
  var instance = null, clazz;

  clazz = declare(null, {
    urlParams: null,
    appConfig: null,
    rawAppConfig: null,
    configFile: null,
    _configLoaded: false,

    constructor: function (urlParams, options) {
      this._removeHash(urlParams);
      this.urlParams = urlParams || {};
      this.widgetManager = WidgetManager.getInstance();
      lang.mixin(this, options);
    },

    loadConfig: function () {
      console.time("Load Config");
      return this._tryLoadConfig().then(lang.hitch(this, function (appConfig) {
        var err = this.checkConfig(appConfig);
        if (err) {
          throw Error(err);
        }

        this._processAfterTryLoad(appConfig);
        this.appConfig = appConfig;

        return this.loadWidgetsManifest(appConfig).then(lang.hitch(this, function (appConfig) {
          return appConfig;
        }));
        // return this.appConfig;

      }), lang.hitch(this, function (err) {
        this.showError(err);
        //we still return a rejected deferred
        var def = new Deferred();
        def.reject(err);
        return def;
      }));
    },

    _processAfterTryLoad: function(appConfig){
      this._processUrlParams(appConfig);

      this.addNeedValues(appConfig);

      return appConfig;
    },

    addNeedValues: function(appConfig){
      this._addElementId(appConfig);
    },

    showError: function(err){
      if(err && err.message){
        html.create("div", {
          "class": "app-error",
          innerHTML: err.message
        }, document.body);
      }
    },
    
    _tryLoadConfig: function () {
      if (this.urlParams.config) {
        this.configFile = this.urlParams.config;
        return xhr(this.configFile, {
          handleAs: "json",
          headers: {
            "X-Requested-With": null
          }
        }).then(lang.hitch(this, function (appConfig) {
          return appConfig;
        }));
      }
      else if (window.projectConfig) {
        this.configFile = window.projectConfig;
        return xhr(this.configFile, {
          handleAs: "json"
        }).then(lang.hitch(this, function (appConfig) {
          return appConfig;
        }));
      }
      else {
        this.configFile = window.path + "config.json";
        return xhr(this.configFile, {
          handleAs: "json"
        }).then(lang.hitch(this, function (appConfig) {
          return appConfig;
        }));
      }
      
    },

    _removeHash: function(urlParams){
      for(var p in urlParams){
        if(urlParams[p]){
          urlParams[p] = urlParams[p].replace("#", "");
        }
      }
    },

    loadWidgetsManifest: function (config) {
      var defs = [], def = new Deferred();
      jimuUtils.visitElement(config, lang.hitch(this, function (element) {
        if (!element.widgets && element.uri) {
          defs.push(loadWidgetManifest(this.widgetManager, element));
        }
      }));
      all(defs).then(function () {
        def.resolve(config);
      });

      function loadWidgetManifest(widgetManager, e){
        return widgetManager.loadWidgetManifest(e).then(function(manifest){
          return manifest;
        }, function(err){
          console.log("Widget failed to load, it is removed.", e.name);

          if(err.stack){
            console.error(err.stack);
          }else{
            //TODO err.code === 400, err.code === 403
            console.log(err);
          }
          deleteUnloadedWidgets(config, e);
        });
      }

      function deleteUnloadedWidgets(config, e){
        //if has e, delete a specific widget
        //if has no e, delete all unloaded widget
        deleteInSection("widgetOnScreen");
        deleteInSection("widgetPool");

        function deleteInSection(section){
          if(config[section] && config[section].widgets){
            config[section].widgets = config[section].widgets.filter(function(w){
              if(e){
                return w.id !== e.id;
              }else{
                if(w.uri && !w.manifest){
                  console.error("Widget is removed because it is not loaded successfully.", w.uri);
                }
                return w.manifest;
              }
            });
          }
          if(config[section] && config[section].groups){
            config[section].groups.forEach(function(g){
              if(g.widgets){
                g.widgets = g.widgets.filter(function(w){
                  if(e){
                    return w.id !== e.id;
                  }else{
                    if(w.uri && !w.manifest){
                      console.error("Widget is removed because it is not loaded successfully.", w.uri);
                    }
                    return w.manifest;
                  }
                });
              }
            });
          }
        }
      }

      setTimeout(function(){
        //delete problem widgets to avoid one widget crash app
        if(!def.isResolved()){
          deleteUnloadedWidgets(config);
          def.resolve(config);
        }
      }, 60 * 1000);
      return def;
    },

    _addElementId: function (appConfig){
      var maxId = 0, i;

      jimuUtils.visitElement(appConfig, function(e){
        if(!e.id){
          return;
        }
        //fix element id
        e.id = e.id.replace(/\//g, "_");

        var li = e.id.lastIndexOf("_");
        if(li > -1){
          i = e.id.substr(li + 1);
          maxId = Math.max(maxId, i);
        }
      });

      jimuUtils.visitElement(appConfig, function(e){
        if(!e.id){
          maxId ++;
          e.id = e.uri? (e.uri.replace(/\//g, "_") + "_" + maxId): (""  + "_" + maxId);
        }
      });
    },

    //we use URL parameters for the first loading.
    //After loaded, if user changes app config through builder,
    //we"ll use the configuration in builder.
    _processUrlParams: function(appConfig){
      var urlWebmap = this.urlParams.itemid || this.urlParams.webmap;
      if(urlWebmap && appConfig.map.itemId !== urlWebmap){
        if(appConfig.map.mapOptions){
          jimuUtils.deleteMapOptions(appConfig.map.mapOptions);
        }
        appConfig.map.itemId = urlWebmap;
      }
      if(this.urlParams.mode){
        appConfig.mode = this.urlParams.mode;
      }
      if(!appConfig.map.mapOptions){
        appConfig.map.mapOptions = {};
      }

      if(this.urlParams.scale){
        appConfig.map.mapOptions.scale = this.urlParams.scale;
      }
      if(this.urlParams.level || this.urlParams.zoom){
        appConfig.map.mapOptions.zoom = this.urlParams.level || this.urlParams.zoom;
      }
    },

    checkConfig: function(config){
      var repeatedId = this._getRepeatedId(config);
      if(repeatedId){
        return "repeated id:" + repeatedId;
      }
      return null;
    },

    _getRepeatedId: function(appConfig){
      var id = [], ret;
      jimuUtils.visitElement(appConfig, function(e){
        if(id.indexOf(e.id) >= 0){
          ret = e.id;
          return true;
        }
        id.push(e.id);
      });
      return ret;
    },

    loadAndUpgradeAllWidgetsConfig: function(appConfig){
      var def = new Deferred(), defs = [];

      jimuUtils.visitElement(appConfig, lang.hitch(this, function(e){
        if(!e.uri){
          return;
        }
        var upgradeDef = this.widgetManager.tryLoadWidgetConfig(e);
        defs.push(upgradeDef);
      }));
      all(defs).then(lang.hitch(this, function(){
        def.resolve(appConfig);
      }), function(err){
        def.reject(err);
      });
      return def;
    }

  });

  clazz.getInstance = function (urlParams, options) {
    if(instance === null) {
      instance = new clazz(urlParams, options);
    }else{
      instance.urlParams = urlParams;
      instance.options = options;
    }
    return instance;
  };

  return clazz;

});