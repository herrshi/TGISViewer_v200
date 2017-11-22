/**
 * Created by herrshi on 2017/6/19.
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/_base/html",
  "dojo/Deferred",
  "dojo/topic",
  "dojo/Evented",
  "dojo/on",
  "dojo/aspect",
  "dojo/json",
  "dojo/query",
  "dojo/request/xhr",
  "dojo/promise/all",
  "jimu/utils",
  "jimu/dijit/Message"
], function (
  declare,
  lang,
  array,
  html,
  Deferred,
  topic,
  Evented,
  on,
  aspect,
  json,
  query,
  xhr,
  all,
  jimuUtils,
  Message
) {
  var instance = null, clazz;

  clazz = declare(Evented, {
    constructor: function() {
      //the loaded widget list
      this.loaded = [];

      //action is triggered, but the widget has not been loaded
      //{id: widgetId, action: {}}
      this.missedActions = [];

      this.activeWidget = null;

      topic.subscribe("mapLoaded", lang.hitch(this, this._onMapLoaded));
      topic.subscribe("appConfigLoaded", lang.hitch(this, this._onAppConfigLoaded));
    },

    loadWidget: function(setting) {
      // summary:
      //    load and create widget, return deferred. when defer is resolved,
      //    widget is returned.
      // description:
      //    setting should contain 2 properties:
      //    id: id should be unique, same id will return same widget object.
      //    uri: the widget"s main class
      var def = new Deferred(), findWidget;
      findWidget = this.getWidgetById(setting.id);

      if (findWidget) {
        //widget have loaded(identified by id)
        def.resolve(findWidget);
      }
      else {
        all([
          this.loadWidgetClass(setting), 
          this.loadWidgetManifest(setting)
        ]).then(lang.hitch(this, function (results) {
          var clazz = results[0];
          var setting = results[1];
          this.loadWidgetResources(setting).then(lang.hitch(this, function (resources) {
            try {
              var widget = this.createWidget(setting, clazz, resources);
              html.setAttr(widget.domNode, "data-widget-name", setting.name);
              console.log("widget [" + setting.uri + "] created.");
            }
            catch (err) {
              console.log("create [" + setting.uri + "] error:" + err.stack);

              def.reject(err);
            }

            //use timeout to let the widget can get the correct dimension in startup function
            setTimeout(lang.hitch(this, function() {
              def.resolve(widget);
              this.emit("widget-created", widget);
              topic.publish("widgetCreated", widget);
            }), 50);

          }), function (err) {
            def.reject(err);
          });
        }), function (err) {
          def.reject(err);
        });
      }

      return def;
    },

    loadWidgetClass: function(setting) {
      // summary:
      //    load the widget"s main class, and return deferred
      var def = new Deferred();


      var uri = window.path + setting.uri + ".js";
      // if(setting.isRemote){
      //   uri = setting.uri + ".js";
      // }else{
      //   uri = setting.uri;
      // }
      require([uri], lang.hitch(this, function(clazz) {
        def.resolve(clazz);
      }));

      // jimuUtils.checkError(setting.uri, def);
      return def;
    },

    loadWidgetResources: function(setting) {
      // summary:
      //    load the widget"s resources(local, style, etc.), and return deferred
      var def = new Deferred(),
        defConfig, defI18n, defStyle, defTemplate, defs = [];

      var setting2 = lang.clone(setting);

      defConfig = this.tryLoadWidgetConfig(setting2);
      defI18n = this._tryLoadResource(setting2, "i18n");
      defStyle = this._tryLoadResource(setting2, "style");
      defTemplate = this._tryLoadResource(setting2, "template");

      defs.push(defConfig);
      defs.push(defI18n);
      defs.push(defTemplate);
      defs.push(defStyle);

      all(defs).then(lang.hitch(this, function(results) {
        var res = {};
        res.config = results[0];
        res.i18n = results[1];
        res.template = results[2];
        // res.style = results[3];
        def.resolve(res);
      }), function(err) {
        console.log(err);
        def.reject(err);
      });

      return def;
    },

    tryLoadWidgetConfig: function(setting) {
      return this._tryLoadWidgetConfig(setting).then(lang.hitch(this, function(config) {
        setting.config = config;
        return config;
      }));
    },

    _tryLoadWidgetConfig: function (setting) {
      var def = new Deferred();
      //need load config first, because the template may be use the config data
      if (setting.config && lang.isObject(setting.config)) {
        //if widget is configurated in the app config.json, the i18n has beed processed
        def.resolve(setting.config);
        return def;
      }
      else if (setting.config) {
        if(require.cache["url:" + setting.config]){
          def.resolve(json.parse(require.cache["url:" + setting.config]));
          return def;
        }

        var configFile = jimuUtils.processUrlInAppConfig(setting.config);
        // The widgetConfig filename is dependent on widget label,
        // IE8 & IE9 do not encode automatically while attempt to request file.
        var configFileArray = configFile.split("/");
        configFileArray[configFileArray.length - 1] =
          encodeURIComponent(configFileArray[configFileArray.length - 1]);
        configFile = configFileArray.join("/");
        return xhr(configFile, {
          handleAs: "json",
          headers: {
            "X-Requested-With": null
          }
        });
      }
      else {
        return this._tryLoadResource(setting, "config").then(function(config){
          //this property is used in map config plugin
          setting.isDefaultConfig = true;
          return config;
        });
      }
    },

    _tryLoadResource: function(setting, flag) {
      var file, hasp,
        def = new Deferred(),
        doLoad = function() {
          var loadDef;
          if (flag === "config") {
            loadDef = this.loadWidgetConfig(setting);
          }
          else if (flag === "style") {
            loadDef = this.loadWidgetStyle(setting);
          }
          else if (flag === "i18n") {
            loadDef = this.loadWidgetI18n(setting);
          }
          else if (flag === "template") {
            loadDef = this.loadWidgetTemplate(setting);
          }
          else if (flag === "settingTemplate") {
            loadDef = this.loadWidgetSettingTemplate(setting);
          }
          else if (flag === "settingStyle") {
            loadDef = this.loadWidgetSettingStyle(setting);
          }
          else if (flag === "settingI18n") {
            loadDef = this.loadWidgetSettingI18n(setting);
          }
          else {
            return def;
          }
          loadDef.then(function(data) {
            def.resolve(data);
          }, function(err) {
            new Message({
              message: window.jimuNls.widgetManager.loadWidgetResourceError + ": " + setting.uri
            });
            def.reject(err);
          });
        };

      if (flag === "config") {
        file = setting.amdFolder + "config.json";
        setting.configFile = file;
        hasp = "hasConfig";
      } else if (flag === "style") {
        file = setting.amdFolder + "css/style.css";
        setting.styleFile = file;
        hasp = "hasStyle";
      } else if (flag === "i18n") {
        file = setting.amdFolder + "nls/strings.js";
        if(setting.isRemote){
          setting.i18nFile = file;
        }else{
          setting.i18nFile = setting.amdFolder + "nls/strings";
        }
        hasp = "hasLocale";
      } else if (flag === "template") {
        file = setting.amdFolder + "Widget.html";
        setting.templateFile = file;
        hasp = "hasUIFile";
      } else if (flag === "settingTemplate") {
        file = setting.amdFolder + "setting/Setting.html";
        setting.settingTemplateFile = file;
        hasp = "hasSettingUIFile";
      } else if (flag === "settingI18n") {
        file = setting.amdFolder + "setting/nls/strings.js";
        if(setting.isRemote){
          setting.settingI18nFile = file;
        }else{
          setting.settingI18nFile = setting.amdFolder + "setting/nls/strings";
        }
        hasp = "hasSettingLocale";
      } else if (flag === "settingStyle") {
        file = setting.amdFolder + "setting/css/style.css";
        setting.settingStyleFile = file;
        hasp = "hasSettingStyle";
      } else {
        return def;
      }

      if (setting[hasp]){
        doLoad.apply(this);
      }else {
        def.resolve(null);
      }
      return def;
    },

    /*
     * Load the css file in a widget.
     * This function load the widget"s css file and insert it into the HTML page through <link>.
     * It also ensure that the css file is inserted only one time.
     */
    loadWidgetStyle: function(widgetSetting) {
      var id = "widget/style/" + widgetSetting.uri,
        def = new Deferred();
      id = this._replaceId(id);
      if (html.byId(id)) {
        def.resolve("load");
        return def;
      }
      var themeCommonStyleId = "theme_" + this.appConfig.theme.name + "_style_common";
      //insert widget style before theme style, to let theme style over widget style
      return jimuUtils.loadStyleLink(id, window.path + widgetSetting.styleFile, themeCommonStyleId);
    },

    loadWidgetSettingStyle: function(widgetSetting) {
      var id = "widget/style/" + widgetSetting.uri + "/setting",
        def = new Deferred();
      id = this._replaceId(id);
      if (html.byId(id)) {
        def.resolve("load");
        return def;
      }
      return jimuUtils.loadStyleLink(id, window.path + widgetSetting.settingStyleFile);
    },

    loadWidgetConfig: function(widgetSetting) {
      var configFilePath = window.path + widgetSetting.configFile;
      if(require.cache["url:" + configFilePath]){
        var def = new Deferred();
        def.resolve(json.parse(require.cache["url:" + configFilePath]));
        return def;
      }
      return xhr(configFilePath, {
        handleAs: "json",
        headers: {
          "X-Requested-With": null
        }
      });
    },

    loadWidgetI18n: function(widgetSetting) {
      var def = new Deferred();
      require(jimuUtils.getRequireConfig(), ["dojo/i18n!" + window.path + widgetSetting.i18nFile + ".js"],
        function(bundle) {
          def.resolve(bundle);
        });
      return def;
    },

    loadWidgetSettingI18n: function(widgetSetting) {
      var def = new Deferred();
      require(jimuUtils.getRequireConfig(), ["dojo/i18n!" + window.path + widgetSetting.settingI18nFile + ".js"],
        function(bundle) {
          def.resolve(bundle);
        });
      return def;
    },

    loadWidgetTemplate: function(widgetSetting) {
      var def = new Deferred();
      require(["dojo/text!" + window.path + widgetSetting.templateFile],
        function(template) {
          def.resolve(template);
        });

      jimuUtils.checkError(widgetSetting.templateFile, def);
      return def;
    },

    loadWidgetSettingTemplate: function(widgetSetting) {
      var def = new Deferred();
      require(jimuUtils.getRequireConfig(), ["dojo/text!" + window.path + widgetSetting.settingTemplateFile],
        function(template) {
          def.resolve(template);
        });

      jimuUtils.checkError(widgetSetting.settingTemplateFile, def);
      return def;
    },

    _replaceId: function(id) {
      return id.replace(/\//g, "_").replace(/\./g, "_");
    },

    loadWidgetManifest: function(widgetJson){
      var def = new Deferred();
      var info = jimuUtils.getUriInfo(widgetJson.uri);
      var url;
      if(info.isRemote){
        url = info.folderUrl + "manifest.json?f=json";
      }else{
        url = info.folderUrl + "manifest.json";
      }

      if(widgetJson.manifest){
        def.resolve(widgetJson);
        return def;
      }

      xhr(url, {
        handleAs: "json",
        headers: {
          "X-Requested-With": null
        }
      }).then(lang.hitch(this, function (manifest) {
        if(manifest.error && manifest.error.code){
          //request manifest from AGOL item, and there is an error
          //error code may be: 400, 403
          return def.reject(manifest.error);
        }

        manifest.category = "widget";
        lang.mixin(manifest, jimuUtils.getUriInfo(widgetJson.uri));
        this._processManifest(manifest);
        jimuUtils.widgetJson.addManifest2WidgetJson(widgetJson, manifest);
        def.resolve(widgetJson);

        jimuUtils.manifest.addI18NLabel(manifest).then(lang.hitch(this, function(){
          this._processManifest(manifest);
          jimuUtils.widgetJson.addManifest2WidgetJson(widgetJson, manifest);
          def.resolve(widgetJson);
        }));

      }));

      return def;
    },

    createWidget: function(setting, clazz, resources) {
      var widget;

      //here, check whether widget have loaded again because loading and create a widget
      //needs some time. If in this period time, more then one loading request will create
      //more widgets with the same id, it"s a error.

      if (this.getWidgetById(setting.id)) {
        return this.getWidgetById(setting.id);
      }

      //the config can contain i18n placeholders
      if (resources.config && resources.i18n) {
        resources.config = jimuUtils.replacePlaceHolder(resources.config, resources.i18n);
      }

      setting.rawConfig = setting.config;
      setting.config = resources.config || {};

      setting.nls = resources.i18n || {};
      if (resources.template) {
        setting.templateString = resources.template;
      }

      setting["class"] = "jimu-widget";
      if (!setting.label) {
        setting.label = setting.name;
      }
      if (this.map) {
        setting.map = this.map;
      }
      setting.appConfig = this.appConfig;

      // for IE8
      var setting2 = {};
      for (var prop in setting) {
        if (setting.hasOwnProperty(prop)) {
          setting2[prop] = setting[prop];
        }
      }

      setting2.widgetManager = this;

      widget = new clazz(setting2);
      widget.clazz = clazz;
      aspect.after(widget, "startup", lang.hitch(this, this._postWidgetStartup, widget));
      aspect.before(widget, "destroy", lang.hitch(this, this._onDestroyWidget, widget));

      on(widget.domNode, "click", lang.hitch(this, this._onClickWidget, widget));

      this.loaded.push(widget);
      return widget;
    },

    _processManifest: function(manifest){
      jimuUtils.manifest.addManifestProperties(manifest);
      jimuUtils.manifest.processManifestLabel(manifest, window.dojoConfig.locale);
    },

    getWidgetById: function(id) {
      var ret;
      array.some(this.loaded, function(w) {
        if (w.id === id) {
          ret = w;
          return true;
        }
      }, this);
      return ret;
    },

    _onAppConfigLoaded: function(_appConfig) {
      var appConfig = lang.clone(_appConfig);
      this.appConfig = appConfig;
    },

    _onMapLoaded: function(map) {
      this.map = map;
    },

    _postWidgetStartup: function(widgetObject) {
      widgetObject.started = true;//for backward compatibility
      jimuUtils.setVerticalCenter(widgetObject.domNode);
      aspect.after(widgetObject, "resize", lang.hitch(this,
        jimuUtils.setVerticalCenter, widgetObject.domNode));
      this.openWidget(widgetObject);     

     
      this._triggerMissedAction(widgetObject);
    },

    _onDestroyWidget: function(widget) {
      if (widget.state !== "closed") {
        this.closeWidget(widget);
      }
      this._removeWidget(widget);
      this.emit("widget-destroyed", widget.id);
      topic.publish("widgetDestroyed", widget.id);
      console.log("destroy widget [" + widget.uri + "].");
    },

    _triggerMissedAction: function(widget) {
      this.missedActions.forEach(function(info) {
        if (info.id === widget.id) {
          widget.onAction(info.action.name, info.action.data);
        }
      });
    },

    openWidget: function(widget) {
      if (typeof widget === "string") {
        widget = this.getWidgetById(widget);
        if (!widget) {
          return;
        }
      }
      if(!widget.started){
        try {
          widget.started = true;
          widget.startup();
        } catch (err) {
          console.error("fail to startup widget " + widget.name + ". " + err.stack);
        }
      }
      if (widget.state === "closed") {
        html.setStyle(widget.domNode, "display", "");
        widget.setState("opened");
        try {
          widget.onOpen();
        } catch (err) {
          console.error("fail to open widget " + widget.name + ". " + err.stack);
        }
      }
    },

    closeWidget: function(widget) {
      if (typeof widget === "string") {
        widget = this.getWidgetById(widget);
        if (!widget) {
          return;
        }
      }
      if (widget.state !== "closed") {
        if(this.activeWidget && this.activeWidget.id === widget.id){
          this.activeWidget.onDeActive();
          this.activeWidget = null;
        }
        html.setStyle(widget.domNode, "display", "none");
        widget.setState("closed");
        try {
          widget.onClose();
        } catch (err) {
          console.log(console.error("fail to close widget " + widget.name + ". " + err.stack));
        }
      }
    },

    _activeWidget: function(widget){
      if(this.activeWidget){
        if(this.activeWidget.id === widget.id){
          //zIndex may be reset by widget self, we do not set in-panel widget zindex
          if(this.activeWidget.inPanel === false && this.activeWidget.moveTopOnActive){
            html.setStyle(this.activeWidget.domNode, "zIndex", 101);
          }
          return;
        }
        if(this.activeWidget.state === "active"){
          this.activeWidget.setState("opened");
          if(this.activeWidget.inPanel === false){
            html.setStyle(widget.domNode, "zIndex",
              "zIndex" in widget.position? widget.position.zIndex: "auto");
          }
          this.activeWidget.onDeActive();
        }
      }
      this.activeWidget = widget;
      if(this.activeWidget.state !== "opened"){
        return;
      }
      this.activeWidget.setState("active");
      if(this.activeWidget.inPanel === false && this.activeWidget.moveTopOnActive){
        html.setStyle(this.activeWidget.domNode, "zIndex", 101);
      }
      this.activeWidget.onActive();
      topic.publish("widgetActived", widget);
    },

    _onClickWidget: function(widget, evt){
      var childWidgets = query(".jimu-widget", widget.domNode);
      if(childWidgets.length > 0){
        for(var i = 0; i < childWidgets.length; i++){
          if(evt.target === childWidgets[i] || html.isDescendant(evt.target, childWidgets[i])){
            //click on the child widget or child widget"s children dom
            return;
          }
        }
      }
      this._activeWidget(widget);
    },

    getOnScreenOffPanelWidgets: function() {
      return array.filter(this.loaded, function(widget) {
        return widget.isOnScreen && !widget.inPanel;
      });
    }

    
  });

  clazz.getInstance = function(urlParams) {
    if (instance === null) {
      instance = new clazz(urlParams);
      window._widgetManager = instance;
    }
    return instance;
  };
  return clazz;

});