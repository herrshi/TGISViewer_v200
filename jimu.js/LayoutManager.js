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
  "dojo/Deferred",
  "dojo/promise/all",
  "dijit/_WidgetBase",
  "jimu/MapManager",
  "jimu/WidgetManager",
  "jimu/PanelManager",
  "jimu/dijit/LoadingShelter",
  "jimu/utils",
  "jimu/OnScreenWidgetIcon"
], function (
  declare,
  lang,
  array,
  html,
  topic,
  on,
  Deferred,
  all,
  _WidgetBase,
  MapManager,
  WidgetManager,
  PanelManager,
  LoadingShelter,
  jimuUtils,
  OnScreenWidgetIcon
) {

  var instance = null, clazz;

  clazz = declare([_WidgetBase], {
    map: null,
    mapId: "map",

    constructor: function(options, domId) {
      this.widgetManager = WidgetManager.getInstance();
      this.panelManager = PanelManager.getInstance();

      this.own(topic.subscribe("appConfigLoaded", lang.hitch(this, this.onAppConfigLoaded)));
      this.own(topic.subscribe("mapLoaded", lang.hitch(this, this.onMapLoaded)));
      this.own(topic.subscribe("preloadModulesLoaded", lang.hitch(this, this._onPreloadModulesLoaded)));

      this.own(topic.subscribe("openWidget", lang.hitch(this, this._onOpenWidgetRequest)));
      this.own(topic.subscribe("closeWidget", lang.hitch(this, this._onCloseWidgetRequest)));

      this.widgetPlaceholders = [];
      this.preloadWidgetIcons = [];
      this.preloadGroupPanels = [];
      this.invisibleWidgetIds = [];

      this.id = domId;

      this.preloadModulesLoadDef = new Deferred();
    },

    postCreate: function(){
      this.containerNode = this.domNode;
    },

    onAppConfigLoaded: function(config){
      this.appConfig = lang.clone(config);

      this._loadMap();

      this.preloadModulesLoadDef.then(lang.hitch(this, function () {
        if(this.appConfig.theme){
          this._loadTheme(this.appConfig.theme);
        }
      }));
    },

    _onPreloadModulesLoaded: function(){
      this.preloadModulesLoadDef.resolve();
    },

    onMapLoaded: function(map) {
      this.map = map;
      this.panelManager.setMap(map);
      this.preloadModulesLoadDef.then(lang.hitch(this, function(){
        this._loadPreloadWidgets(this.appConfig);
      }));
    },

    _loadMap: function() {
      html.create("div", {
        id: this.mapId,
        style: lang.mixin({
          position: "absolute",
          backgroundColor: "#EEEEEE",
          overflow: "hidden",
          minWidth:"1px",
          minHeight:"1px",
          display: "flex"
        })
      }, this.id);

      this.mapManager = MapManager.getInstance({
        appConfig: this.appConfig,
        urlParams: this.urlParams
      }, this.mapId);
      this.mapManager.setMapPosition(this.appConfig.map.position);
      this.mapManager.showMap();
    },

    _loadTheme: function(theme) {
      require([window.path + "themes/" + theme.name + "/main.js"], lang.hitch(this, function () {
        this._loadThemeCommonStyle(theme);
        this._loadThemeCurrentStyle(theme);
        // this._addCustomStyle(theme);
      }));
    },

    _loadThemeCommonStyle: function(theme) {
      jimuUtils.loadStyleLink(this._getThemeCommonStyleId(theme),
        "themes/" + theme.name + "/common.css");
      // append theme name for better selector definition
      html.addClass(this.domNode, theme.name);
    },

    _removeThemeCommonStyle: function(theme){
      html.removeClass(this.domNode, theme.name);
      html.destroy(this._getThemeCommonStyleId(theme));
    },

    _loadThemeCurrentStyle: function(theme) {
      jimuUtils.loadStyleLink(this._getThemeCurrentStyleId(theme),
        "themes/" + theme.name + "/styles/" + theme.styles[0] + "/style.css");
      // append theme style name for better selector definitions
      html.addClass(this.domNode, theme.styles[0]);
    },

    _removeThemeCurrentStyle: function(theme){
      html.removeClass(this.domNode, theme.styles[0]);
      html.destroy(this._getThemeCurrentStyleId(theme));
    },

    _getThemeCommonStyleId: function(theme){
      return "theme_" + theme.name + "_style_common";
    },

    _getThemeCurrentStyleId: function(theme){
      return "theme_" + theme.name + "_style_" + theme.styles[0];
    },

    _loadPreloadWidgets: function(appConfig) {
      console.time("Load widgetOnScreen");
      var loading = new LoadingShelter(), deferreds = [];
      loading.placeAt(this.id);
      loading.startup();

      //load widgets
      array.forEach(appConfig.widgetOnScreen.widgets, function(widgetConfig) {
        if(widgetConfig.visible === false){
          this.invisibleWidgetIds.push(widgetConfig.id);
          return;
        }
        deferreds.push(this._loadPreloadWidget(widgetConfig, appConfig));
      }, this);

      all(deferreds).then(lang.hitch(this, function(){
        if(loading){
          loading.destroy();
          loading = null;
        }
        console.timeEnd("Load widgetOnScreen");
        topic.publish("preloadWidgetsLoaded");
        if (window.loadFinishCallback) {
          window.loadFinishCallback();
        }
      }), lang.hitch(this, function() {
        if(loading){
          loading.destroy();
          loading = null;
        }
        //if error when load widget, let the others continue
        console.timeEnd("Load widgetOnScreen");
        topic.publish("preloadWidgetsLoaded");
      }));
    },

    _loadPreloadWidget: function(widgetConfig, appConfig) {
      var def = new Deferred();

      if(!widgetConfig.uri){
        //in run mode, when no uri, do nothing
        def.resolve(null);
        return def;
      }

      var iconDijit;
      if (widgetConfig.inPanel || widgetConfig.closeable) {
        //in panel widget or closeable off panel widget
        iconDijit = this._createPreloadWidgetIcon(widgetConfig);
        def.resolve(iconDijit);
      }
      else {
        //off panel
        this.widgetManager.loadWidget(widgetConfig).then(lang.hitch(this, function (widget) {
          try {
            widget.setPosition(widget.position);
            this.widgetManager.openWidget(widget);

          }
          catch (err) {
            console.log(console.error("fail to startup widget " + widget.name + ". " + err.stack));
          }

          widget.configId = widgetConfig.id;
          def.resolve(widget);
        }), function (err) {
          def.reject(err);
        });
      }

      return def;

    },

    _createPreloadWidgetIcon: function (widgetConfig) {
      var iconDijit = new OnScreenWidgetIcon({
        panelManager: this.panelManager,
        widgetManager: this.widgetManager,
        widgetConfig: widgetConfig,
        configId: widgetConfig.id,
        map: this.map
      });

      if(widgetConfig.position.relativeTo === "map"){
        html.place(iconDijit.domNode, this.mapId);
      }else{
        html.place(iconDijit.domNode, this.id);
      }

      //icon position doesn't use width/height in config
      html.setStyle(iconDijit.domNode, jimuUtils.getPositionStyle({
        top: widgetConfig.position.top,
        left: widgetConfig.position.left,
        right: widgetConfig.position.right,
        bottom: widgetConfig.position.bottom,
        width: 40,
        height: 40
      }));
      iconDijit.startup();

      if(!this.openAtStartWidget && widgetConfig.openAtStart){
        iconDijit.switchToOpen();
        this.openAtStartWidget = widgetConfig.name;
      }

      this.preloadWidgetIcons.push(iconDijit);
      return iconDijit;
    },

    _onOpenWidgetRequest: function(widgetId){
      //check on screen widgets, we don't check not-closeable off-panel widget
      array.forEach(this.preloadWidgetIcons, function(widgetIcon){
        if(widgetIcon.configId === widgetId){
          widgetIcon.switchToOpen();
          return;
        }
      }, this);

      this.widgetManager.openWidget(widgetId);
    },

    _onCloseWidgetRequest: function (widgetId) {
      //check on screen widgets, we don't check not-closeable off-panel widget
      array.forEach(this.preloadWidgetIcons, function(widgetIcon){
        if(widgetIcon.configId === widgetId){
          widgetIcon.switchToClose();
          return;
        }
      }, this);
      this.widgetManager.closeWidget(widgetId);
    }

  });

  clazz.getInstance = function(options, domId) {
    if (instance === null) {
      instance = new clazz(options, domId);
      window._layoutManager = instance;
    }
    return instance;
  };
  return clazz;

});
