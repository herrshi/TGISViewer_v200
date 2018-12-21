/**
 * Created by herrshi on 2017/6/19.
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/_base/html",
  "dojo/topic",
  "dojo/on",
  "jimu/ConfigLoader",
  "jimu/dijit/LoadingIndicator",
  "jimu/WidgetManager",
  "jimu/utils",
  "esri/config",
  "esri/tasks/GeometryService"
], function (
  declare,
  lang,
  array,
  html,
  topic,
  on,
  ConfigLoader,
  LoadingIndicator,
  WidgetManager,
  jimuUtils,
  esriConfig,
  GeometryService
) {
  var instance = null, clazz;

  clazz = declare(null, {
    urlParams: null,
    appConfig: null,
    configFile: null,
    _configLoaded: false,

    constructor: function (urlParams) {
      this.urlParams = urlParams || {};

      this.widgetManager = WidgetManager.getInstance();
      this.configLoader = ConfigLoader.getInstance(this.urlParams, {});
    },

    loadConfig: function(){
      var loading = new LoadingIndicator();
      loading.placeAt(window.jimuConfig.layoutId);

      return this.configLoader.loadConfig().then(lang.hitch(this, function (appConfig) {
        this.appConfig = this._addDefaultValues(appConfig);
        console.timeEnd("Load Config");

        loading.destroy();
        topic.publish("appConfigLoaded", appConfig);
        return appConfig;
      }), lang.hitch(this, function (err) {
        loading.destroy();
        console.error(err);
        if(err && err.message && typeof err.message === "string") {
          this._showErrorMessage(err.message);
        }
      }));
    },

    /**********************************************
     * Add default values
     ************************************************/
    _addDefaultValues: function(config) {
      this._addDefaultGeometryService(config);
      this._addDefaultStyle(config);
      this._addDefaultMap(config);
      this._addDefaultVisible(config);

      //preload widgets
      if(typeof config.widgetOnScreen === "undefined"){
        config.widgetOnScreen = {};
      }

      if(typeof config.widgetPool === "undefined"){
        config.widgetPool = {};
      }

      this._addDefaultPanelAndPosition(config);
      this._addDefaultOfWidgetGroup(config);
      //if the first widget or first group doesn"t have index property, we add it
      if(config.widgetPool.widgets && config.widgetPool.widgets.length > 0 &&
        config.widgetPool.widgets[0].index === undefined ||
        config.widgetPool.groups && config.widgetPool.groups.length > 0 &&
        config.widgetPool.groups[0].index === undefined){
        this._addIndexForWidgetPool(config);
      }
      return config;
    },

    _addDefaultGeometryService: function(appConfig){
      var geoServiceUrl = appConfig && appConfig.geometryService;
      var validGeoServiceUrl = geoServiceUrl && typeof geoServiceUrl === "string" &&
        lang.trim(geoServiceUrl);
      if(validGeoServiceUrl){
        geoServiceUrl = lang.trim(geoServiceUrl);
        geoServiceUrl = geoServiceUrl.replace(/{gisServer}/i, appConfig.gisServer);
      }

      appConfig.geometryService = geoServiceUrl;
      esriConfig.defaults.geometryService = new GeometryService(appConfig.geometryService);
    },

    _addDefaultStyle: function(config){
      if(config.theme){
        if(!config.theme.styles || config.theme.styles.length === 0){
          config.theme.styles = ["default"];
        }
      }
    },

    _addDefaultMap: function(config){
      config.map.id = "map";

      if(typeof config.map["3D"] === "undefined" && typeof config.map["2D"] === "undefined"){
        config.map["2D"] = true;
      }

      if(typeof config.map.position === "undefined"){
        config.map.position = {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0
        };
      }
    },

    _addDefaultVisible: function(config){
      jimuUtils.visitElement(config, function(e){
        if(e.visible === undefined){
          e.visible = true;
        }
      });
    },

    _addDefaultPanelAndPosition: function(config){
      this._addOnScreenDefaultPanelAndPosition(config);
      this._addPoolDefaultPanelAndPosition(config);
    },

    _addOnScreenDefaultPanelAndPosition: function(config){
      var i, j, screenSectionConfig = config.widgetOnScreen;

      if(!screenSectionConfig){
        return;
      }

      var panelDefaultPositionR =
        screenSectionConfig.panel && screenSectionConfig.panel.positionRelativeTo?
          screenSectionConfig.panel.positionRelativeTo: "map";

      if(typeof screenSectionConfig.panel === "undefined" ||
        typeof screenSectionConfig.panel.uri === "undefined"){
        screenSectionConfig.panel = {
          uri: window.path + "jimu.js/OnScreenWidgetPanel.js",
          //positionRelativeTo: "map",
          position: {
            //move positionRelativeTo to position.relativeTo
            relativeTo: panelDefaultPositionR
          }
        };
      }else if(typeof screenSectionConfig.panel.position === "undefined"){
        screenSectionConfig.panel.position = {relativeTo: panelDefaultPositionR};
      }else if(typeof screenSectionConfig.panel.position.relativeTo === "undefined"){
        screenSectionConfig.panel.position.relativeTo = panelDefaultPositionR;
      }

      if(screenSectionConfig.widgets){
        for(i = 0; i < screenSectionConfig.widgets.length; i++){
          if(!screenSectionConfig.widgets[i].position){
            screenSectionConfig.widgets[i].position = {};
          }
          if(!screenSectionConfig.widgets[i].position.relativeTo){
            screenSectionConfig.widgets[i].position.relativeTo =
              screenSectionConfig.widgets[i] && screenSectionConfig.widgets[i].positionRelativeTo?
                screenSectionConfig.widgets[i].positionRelativeTo: "map";
          }
          if(screenSectionConfig.widgets[i].inPanel === true &&
            !screenSectionConfig.widgets[i].panel){
            screenSectionConfig.widgets[i].panel = lang.clone(screenSectionConfig.panel);
            screenSectionConfig.widgets[i].panel.position = screenSectionConfig.widgets[i].position;
            screenSectionConfig.widgets[i].panel.position.relativeTo =
              screenSectionConfig.widgets[i].position.relativeTo;
          }
        }
      }

      if(screenSectionConfig.groups){
        for(i = 0; i < screenSectionConfig.groups.length; i++){
          if(!screenSectionConfig.groups[i].panel){
            screenSectionConfig.groups[i].panel = screenSectionConfig.panel;
          }

          if(screenSectionConfig.groups[i].panel && !screenSectionConfig.groups[i].panel.position){
            screenSectionConfig.groups[i].panel.position = {};
          }

          if(!screenSectionConfig.groups[i].panel.position.relativeTo){
            screenSectionConfig.groups[i].panel.position.relativeTo =
              screenSectionConfig.groups[i].panel.positionRelativeTo?
                screenSectionConfig.groups[i].panel.positionRelativeTo:"map";
          }

          if(!screenSectionConfig.groups[i].widgets){
            screenSectionConfig.groups[i].widgets = [];
          }
          for(j = 0; j < screenSectionConfig.groups[i].widgets.length; j++){
            screenSectionConfig.groups[i].widgets[j].panel = screenSectionConfig.groups[i].panel;
          }
        }
      }
    },

    _addPoolDefaultPanelAndPosition: function(config){
      var i, j, poolSectionConfig = config.widgetPool;

      if(!poolSectionConfig){
        return;
      }

      var panelDefaultPositionR =
        poolSectionConfig.panel && poolSectionConfig.panel.positionRelativeTo?
          poolSectionConfig.panel.positionRelativeTo: "map";

      if(typeof poolSectionConfig.panel === "undefined" ||
        typeof poolSectionConfig.panel.uri === "undefined"){
        poolSectionConfig.panel = {
          uri: window.path + "jimu.js/OnScreenWidgetPanel.js",
          position: {
            relativeTo: panelDefaultPositionR
          }
        };
      }else if(typeof poolSectionConfig.panel.position === "undefined"){
        poolSectionConfig.panel.position = {relativeTo: panelDefaultPositionR};
      }else if(typeof poolSectionConfig.panel.position.relativeTo === "undefined"){
        poolSectionConfig.panel.position.relativeTo = panelDefaultPositionR;
      }

      if(poolSectionConfig.groups){
        for(i = 0; i < poolSectionConfig.groups.length; i++){
          if(!poolSectionConfig.groups[i].panel){
            poolSectionConfig.groups[i].panel = poolSectionConfig.panel;
          }else if(!poolSectionConfig.groups[i].panel.position.relativeTo){
            poolSectionConfig.groups[i].panel.position.relativeTo =
              poolSectionConfig.groups[i].panel.positionRelativeTo?
                poolSectionConfig.groups[i].panel.positionRelativeTo: "map";
          }

          if(!poolSectionConfig.groups[i].widgets){
            poolSectionConfig.groups[i].widgets = [];
          }
          for(j = 0; j < poolSectionConfig.groups[i].widgets.length; j++){
            poolSectionConfig.groups[i].widgets[j].panel = poolSectionConfig.groups[i].panel;
          }
        }
      }

      if(poolSectionConfig.widgets){
        for(i = 0; i < poolSectionConfig.widgets.length; i++){
          if(poolSectionConfig.widgets[i].inPanel === false){
            var defaultWidgetPositionR = poolSectionConfig.widgets[i].positionRelativeTo?
              poolSectionConfig.widgets[i].positionRelativeTo: "map";
            if(!poolSectionConfig.widgets[i].position){
              poolSectionConfig.widgets[i].position = {
                relativeTo: defaultWidgetPositionR
              };
            }else if(!poolSectionConfig.widgets[i].position.relativeTo){
              poolSectionConfig.widgets[i].position.relativeTo = defaultWidgetPositionR;
            }
          }else if(!poolSectionConfig.widgets[i].panel){
            poolSectionConfig.widgets[i].panel = config.widgetPool.panel;
          }
        }
      }
    },

    _addDefaultOfWidgetGroup: function(config){
      //group/widget label, icon
      jimuUtils.visitElement(config, lang.hitch(this, function(e, info){
        e.isOnScreen = info.isOnScreen;
        if(e.widgets){
          //it"s group
          e.gid = e.id;
          if(e.widgets.length === 1){
            if(!e.label){
              e.label = e.widgets[0].label? e.widgets[0].label: "Group";
            }
            if(!e.icon){
              if(e.widgets[0].uri){
                e.icon = this._getDefaultIconFromUri(e.widgets[0].uri);
              }else{
                e.icon = window.path + "jimu.js/images/group_icon.png";
              }
            }
          }else{
            e.icon = e.icon? e.icon: window.path + "jimu.js/images/group_icon.png";
            e.label = e.label? e.label: "Group_" + info.index;
          }
        }else{
          e.gid = info.groupId;
        }
      }));
    },

    _getDefaultIconFromUri: function(uri){
      var segs = uri.split("/");
      segs.pop();
      return segs.join("/") + "/images/icon.png?wab_dv=" + window.deployVersion;
    },

    _addIndexForWidgetPool: function(config){
      //be default, widgets are in front
      var index = 0, i, j;
      if(config.widgetPool.widgets){
        for(i = 0; i < config.widgetPool.widgets.length; i++){
          config.widgetPool.widgets[i].index = index;
          index ++;
        }
      }

      if(config.widgetPool.groups){
        for(i = 0; i < config.widgetPool.groups.length; i++){
          config.widgetPool.groups[i].index = index;
          index ++;
          for(j = 0; j < config.widgetPool.groups[i].widgets.length; j++){
            config.widgetPool.groups[i].widgets[j].index = j;
          }
        }
      }
    },

    _showErrorMessage: function(msg){
      html.create("div", {
        "class": "app-error",
        innerHTML: msg
      }, document.body);
    }

  });

  clazz.getInstance = function (urlParams) {
    if(instance === null) {
      instance = new clazz(urlParams);
    }else{
      if(urlParams){
        instance.urlParams = urlParams;
        if(instance.configLoader){
          instance.configLoader.urlParams = urlParams;
        }
      }
    }

    window.getAppConfig = lang.hitch(instance, instance.getAppConfig);
    return instance;
  };


  return clazz;
});
