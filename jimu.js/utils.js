define([
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/_base/html",
  "dojo/_base/sniff",
  "dojo/_base/config",
  "dojo/json",
  "dojo/Deferred",
  "dojo/on",
  "dojo/query",
  "dojo/number",
  "dojo/i18n!dojo/cldr/nls/number",
  "esri/lang",
  "esri/dijit/PopupTemplate",
  "esri/geometry/Point",
  "esri/geometry/Polygon"
], function (
  lang,
  array,
  html,
  has,
  config,
  json,
  Deferred,
  on,
  query,
  dojoNumber,
  nlsBundle,
  esriLang,
  PopupTemplate,
  Point,
  Polygon
) {
  /* global ActiveXObject, testLoad */

  var mo = {};

  var widgetProperties = ["inPanel", "hasLocale", "hasStyle", "hasConfig", "hasUIFile",
    "hasSettingPage", "hasSettingUIFile", "hasSettingLocale", "hasSettingStyle",
    "keepConfigAfterMapSwitched", "isController", "hasVersionManager", "isThemeWidget",
    "supportMultiInstance"];

  mo.getPositionStyle = function(_position) {
    var style = {};
    if(!_position){
      return style;
    }
    var position = lang.clone(_position);

    var ps = ["left", "top", "right", "bottom", "width", "height",
      "padding", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom"];
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      if (typeof position[p] === "number") {
        style[p] = position[p] + "px";
      } else if (typeof position[p] !== "undefined") {
        style[p] = position[p];
      }else{
        if(p.substr(0, 7) === "padding"){
          style[p] = 0;
        }else{
          style[p] = "auto";
        }
      }
    }

    if(typeof position.zIndex === "undefined"){
      //set zindex=auto instead of 0, because inner dom of widget may need to overlay other widget
      //that has the same zindex.
      style.zIndex = "auto";
    }else{
      style.zIndex = position.zIndex;
    }
    return style;
  };

  mo.visitElement = function (appConfig, cb) {
    visitBigSection("widgetOnScreen", cb);
    visitBigSection("widgetPool", cb);

    function visitBigSection(section, cb){
      var i, j, group, widget, isOnScreen = (section === "widgetOnScreen");
      if (appConfig[section]) {
        if (appConfig[section].groups) {
          for (i = 0; i < appConfig[section].groups.length; i++) {
            group = appConfig[section].groups[i];
            cb(group, {
              index: i,
              isWidget: false,
              groupId: group.id,
              isThemeWidget: false,
              isOnScreen: isOnScreen
            });
            if(!appConfig[section].groups[i].widgets){
              continue;
            }
            for (j = 0; j < appConfig[section].groups[i].widgets.length; j++) {
              widget = appConfig[section].groups[i].widgets[j];
              cb(widget, {
                index: j,
                isWidget: true,
                groupId: group.id,
                // isThemeWidget: widget.uri && widget.uri.indexOf("themes/" + appConfig.theme.name) > -1,
                isOnScreen: isOnScreen
              });
            }
          }
        }

        if (appConfig[section].widgets) {
          for (i = 0; i < appConfig[section].widgets.length; i++) {
            widget = appConfig[section].widgets[i];
            cb(appConfig[section].widgets[i], {
              index: i,
              isWidget: true,
              groupId: section,
              // isThemeWidget: widget.uri && widget.uri.indexOf("themes/" + appConfig.theme.name) > -1,
              isOnScreen: isOnScreen
            });
          }
        }
      }
    }
  };

  mo.getConfigElementById = function (appConfig, id) {
    var c;
    if(id === "map"){
      return appConfig.map;
    }
    mo.visitElement(appConfig, function(e){
      if(e.id === id){
        c = e;
        return true;
      }
    });
    return c;
  };

  //remove the options that are relative to map"s display
  //this method should be called when map is changed.
  mo.deleteMapOptions = function(mapOptions){
    if(!mapOptions){
      return;
    }
    delete mapOptions.extent;
    delete mapOptions.lods;
    delete mapOptions.center;
    delete mapOptions.scale;
    delete mapOptions.zoom;
    delete mapOptions.maxScale;
    delete mapOptions.maxZoom;
    delete mapOptions.minScale;
    delete mapOptions.minZoom;
  };

  ///////////////////widget json(in app config json) processing

  mo.getUriInfo = function getUriInfo(uri) {
    var pos, firstSeg, info = {},
      amdFolder;

    pos = uri.indexOf("/");
    firstSeg = uri.substring(0, pos);

    //config using package
    amdFolder = uri.substring(0, uri.lastIndexOf("/") + 1);
    info.folderUrl = window.path + amdFolder;
    info.amdFolder = amdFolder;

    info.url = info.folderUrl;//for backward compatibility

    if(/^http(s)?:\/\//.test(uri) || /^\/\//.test(uri)){
      info.isRemote = true;
    }

    return info;
  };

  mo.widgetJson = (function(){
    var ret = {};

    ret.addManifest2WidgetJson = function(widgetJson, manifest){
      lang.mixin(widgetJson, manifest.properties);
      widgetJson.name = manifest.name;
      // if(!widgetJson.label){
      //   widgetJson.label = manifest.label;
      // }
      widgetJson.label = manifest.label;
      widgetJson.manifest = manifest;
      widgetJson.isRemote = manifest.isRemote;
      if(widgetJson.isRemote){
        widgetJson.itemId = manifest.itemId;
      }
      if(manifest.featureActions){
        widgetJson.featureActions = manifest.featureActions;
      }

      if (!widgetJson.icon) {
        widgetJson.icon = manifest.icon;
      }

      if (!widgetJson.thumbnail) {
        widgetJson.thumbnail = manifest.thumbnail;
      }

      widgetJson.folderUrl = manifest.folderUrl;
      widgetJson.amdFolder = manifest.amdFolder;
    };

    ret.removeManifestFromWidgetJson = function(widgetJson){
      //we set property to undefined, instead of delete them.
      //The reason is: configmanager can"t hanle delete properties for now
      if(!widgetJson.manifest){
        return;
      }
      for(var p in widgetJson.manifest.properties){
        widgetJson[p] = undefined;
      }
      widgetJson.name = undefined;
      widgetJson.label = undefined;
      widgetJson.featureActions = undefined;
      widgetJson.manifest = undefined;
    };
    return ret;
  })();

  /////////////widget and theme manifest processing/////////
  mo.manifest = (function(){
    var ret = {};

    function addThemeManifestProperties(manifest) {
      manifest.panels.forEach(function(panel) {
        panel.uri = "panels/" + panel.name + "/Panel.js";
      });

      manifest.styles.forEach(function(style) {
        style.uri = "styles/" + style.name + "/style.css";
      });

      manifest.layouts.forEach(function(layout) {
        layout.uri = "layouts/" + layout.name + "/config.json";
        layout.icon = "layouts/" + layout.name + "/icon.png";
        layout.RTLIcon = "layouts/" + layout.name + "/icon_rtl.png";
      });
    }

    function addWidgetManifestProperties(manifest) {
      //because tingo db engine doesn"t support 2D, 3D property, so, change here
      if (typeof manifest["2D"] !== "undefined") {
        manifest.support2D = manifest["2D"];
      }
      if (typeof manifest["3D"] !== "undefined") {
        manifest.support3D = manifest["3D"];
      }

      if (typeof manifest["2D"] === "undefined" && typeof manifest["3D"] === "undefined") {
        manifest.support2D = true;
      }

      delete manifest["2D"];
      delete manifest["3D"];

      if (typeof manifest.properties === "undefined") {
        manifest.properties = {};
      }

      if (typeof manifest.properties.isController === "undefined") {
        manifest.properties.isController = false;
      }
      if (typeof manifest.properties.isThemeWidget === "undefined") {
        manifest.properties.isThemeWidget = false;
      }
      if (typeof manifest.properties.hasVersionManager === "undefined") {
        manifest.properties.hasVersionManager = false;
      }

      widgetProperties.forEach(function(p) {
        if (typeof manifest.properties[p] === "undefined") {
          manifest.properties[p] = true;
        }
      });
    }

    ret.addManifestProperties = function(manifest) {
      if(!manifest.icon){
        manifest.icon = manifest.folderUrl + "images/icon.png?wab_dv=" + window.deployVersion;
      }

      if (!manifest.thumbnail) {
        manifest.thumbnail = manifest.folderUrl + "images/thumbnail.png";
      }

      if(manifest.category === "theme") {
        addThemeManifestProperties(manifest);
      } else {
        addWidgetManifestProperties(manifest);
      }
    };

    ret.processManifestLabel = function(manifest, locale){
      var langCode = locale.split("-")[0];
      manifest.label = manifest.i18nLabels && (manifest.i18nLabels[locale] || manifest.i18nLabels[langCode] ||
        manifest.i18nLabels.defaultLabel) ||
        manifest.label ||
        manifest.name;
      if(manifest.layouts){
        array.forEach(manifest.layouts, function(layout){
          var key = "i18nLabels_layout_" + layout.name;
          layout.label = manifest[key] && (manifest[key][locale] ||
            manifest[key].defaultLabel) ||
            layout.label ||
            layout.name;
        });
      }
      if(manifest.styles){
        array.forEach(manifest.styles, function(_style){
          var key = "i18nLabels_style_" + _style.name;
          _style.label = manifest[key] && (manifest[key][locale] ||
            manifest[key].defaultLabel) ||
            _style.label ||
            _style.name;
        });
      }
    };

    ret.addI18NLabel = function(manifest){
      var def = new Deferred();
      if(manifest.i18nLabels){
        def.resolve(manifest);
        return def;
      }
      manifest.i18nLabels = {};

      if(manifest.properties && manifest.properties.hasLocale === false){
        def.resolve(manifest);
        return def;
      }

      //theme or widget label
      var nlsFile;
      if(manifest.isRemote){
        nlsFile = manifest.amdFolder + "nls/strings.js";
      }else{
        nlsFile = manifest.amdFolder + "nls/strings";
      }
      require(["dojo/i18n!" + nlsFile],
        function(localeStrings){
          var localesStrings = {};
          localesStrings[window.dojoConfig.locale] = localeStrings;
          addI18NLabelToManifest(manifest, null, localesStrings);
          def.resolve(manifest);
        });

      return def;
    };
    return ret;
  })();

  /**
   * @param {Object} manifest
   * @param {Object} defaultStrings
   * @param {Object} {
   *  locale, localeString
   * }
   */
  function addI18NLabelToManifest(manifest, defaultStrings, localesStrings){
    manifest.i18nLabels = {};
    //theme or widget label
    var key = manifest.category === "widget"? "_widgetLabel": "_themeLabel";
    //add default labels
    if(defaultStrings && defaultStrings.root && defaultStrings.root[key]){
      manifest.i18nLabels.defaultLabel = defaultStrings.root[key];

      //theme"s layout and style label
      if(manifest.category === "theme"){
        if(manifest.layouts){
          manifest.layouts.forEach(function(layout){
            manifest["i18nLabels_layout_" + layout.name] = {};
            manifest["i18nLabels_layout_" + layout.name].defaultLabel =
              defaultStrings.root["_layout_" + layout.name];
          });
        }

        if(manifest.styles){
          manifest.styles.forEach(function(style){
            manifest["i18nLabels_style_" + style.name] = {};
            manifest["i18nLabels_style_" + style.name].defaultLabel =
              defaultStrings.root["_style_" + style.name];
          });
        }
      }

      if(manifest.category === "widget"){
        if(manifest.featureActions){
          manifest.featureActions.forEach(function(action){
            manifest["i18nLabels_featureAction_" + action.name] = {};
            manifest["i18nLabels_featureAction_" + action.name].defaultLabel =
              defaultStrings.root["_featureAction_" + action.name];
          });
        }
      }
    }
    //add locale labels
    for(var p in localesStrings){
      var localeStrings = localesStrings[p];
      addOneLocale(p, localeStrings);
    }

    function addOneLocale(p, localeStrings){
      if(localeStrings[key]){
        manifest.i18nLabels[p] = localeStrings[key];
      }

      //theme"s layout and style label
      if(manifest.category === "theme"){
        if(manifest.layouts){
          manifest.layouts.forEach(function(layout){
            if(!manifest["i18nLabels_layout_" + layout.name]){
              manifest["i18nLabels_layout_" + layout.name] = {};
            }
            manifest["i18nLabels_layout_" + layout.name][p] = localeStrings["_layout_" + layout.name];
          });
        }

        if(manifest.styles){
          manifest.styles.forEach(function(style){
            if(!manifest["i18nLabels_style_" + style.name]){
              manifest["i18nLabels_style_" + style.name] = {};
            }
            manifest["i18nLabels_style_" + style.name][p] = localeStrings["_style_" + style.name];
          });
        }
      }

      if(manifest.category === "widget"){
        if(manifest.featureActions){
          manifest.featureActions.forEach(function(action){
            if(!manifest["i18nLabels_featureAction_" + action.name]){
              manifest["i18nLabels_featureAction_" + action.name] = {};
            }
            manifest["i18nLabels_featureAction_" + action.name][p] =
              localeStrings["_featureAction_" + action.name];
          });
        }
      }
    }
  }

  //if no beforeId, append to head tag, or insert before the id
  mo.loadStyleLink = function (id, href, beforeId) {
    var def = new Deferred(), styleNode, styleLinkNode;

    var hrefPath = require(mo.getRequireConfig()).toUrl(href);
    //the cache will use the baseUrl + module as the key
    if(require.cache["url:" + hrefPath]){
      //when load css file into index.html as <style>, we need to fix the
      //relative path used in css file
      var cssStr = require.cache["url:" + hrefPath];
      var fileName = hrefPath.split("/").pop();
      var rpath = hrefPath.substr(0, hrefPath.length - fileName.length);
      cssStr = addRelativePathInCss(cssStr, rpath);
      if (beforeId) {
        styleNode = html.create("style", {
          id: id,
          type: "text/css"
        }, html.byId(beforeId), "before");
      } else {
        styleNode = html.create("style", {
          id: id,
          type: "text/css"
        }, document.getElementsByTagName("head")[0]);
      }

      if(styleNode.styleSheet && !styleNode.sheet){
        //for IE
        styleNode.styleSheet.cssText = cssStr;
      }else{
        styleNode.appendChild(html.toDom(cssStr));
      }
      def.resolve("load");
      return def;
    }

    if (beforeId) {
      styleLinkNode = html.create("link", {
        id: id,
        rel: "stylesheet",
        type: "text/css",
        href: hrefPath
      }, html.byId(beforeId), "before");
    } else {
      styleLinkNode = html.create("link", {
        id: id,
        rel: "stylesheet",
        type: "text/css",
        href: hrefPath
      }, document.getElementsByTagName("head")[0]);
    }

    // def.resolve("load");
    on(styleLinkNode, "load", function() {
      def.resolve("load");
    });

    //for the browser which doesn"t fire load event
    //safari update documents.stylesheets when style is loaded.
    var ti = setInterval(function() {
      var loadedSheet;
      if (array.some(document.styleSheets, function(styleSheet) {
          if (styleSheet.href && styleSheet.href.substr(styleSheet.href.indexOf(href),
              styleSheet.href.length) === href) {
            loadedSheet = styleSheet;
            return true;
          }
        })) {
        try{
          if (!def.isFulfilled() && (loadedSheet.cssRules && loadedSheet.cssRules.length ||
            loadedSheet.rules && loadedSheet.rules.length)) {
            def.resolve("load");
          }
          clearInterval(ti);
        }catch(err){
          //In FF, we can"t access .cssRules before style sheet is loaded,
          //but FF will emit load event. So, we catch this error and do nothing,
          //just wait for FF to emit load event and go on.
        }
      }
    }, 50);
    return def;
  };

  function addRelativePathInCss(css, rpath){
    var m = css.match(/url\([^)]+\)/gi), i, m2;

    if (m === null || rpath === "") {
      return css;
    }
    for (i = 0; i < m.length; i++) {
      m2 = m[i].match(/(url\(["|"]?)(.*)((?:["|"]?)\))/i);
      if(m2.length >= 4){
        var path = m2[2];
        if(!rpath.endWith("/")){
          rpath = rpath + "/";
        }
        css = css.replace(m2[1] + path + m2[3], m2[1] + rpath + path + m2[3]);
      }
    }
    return css;
  }

  mo.getRequireConfig = function() {
    /* global jimuConfig */
    if (jimuConfig) {
      var packages = [];
      if (jimuConfig.widgetsPackage) {
        packages = packages.concat(jimuConfig.widgetsPackage);
      }
      if (jimuConfig.themesPackage) {
        packages = packages.concat(jimuConfig.themesPackage);
      }
      if (jimuConfig.configsPackage) {
        packages = packages.concat(jimuConfig.configsPackage);
      }
      return {
        packages: packages
      };
    } else {
      return {};
    }
  };

  var errorCheckLists = [];
  require.on("error", function(err) {
    array.forEach(errorCheckLists, function(o) {
      if (err.info[0] && err.info[0].indexOf(o.resKey) > -1) {
        o.def.reject(err);
      }
      for (var p in err.info) {
        if (p.indexOf(o.resKey) > -1) {
          o.def.reject(err);
        }
      }
    });
  });
  mo.checkError = function(resKey, def) {
    //when resKey match a error, def will be reject
    errorCheckLists.push({
      resKey: resKey,
      def: def
    });
  };

  /**
   * Repalce the placeholders in the obj Object properties with the props Object values,
   * return the replaced object
   * The placeholder syntax is: ${prop}
   */
  mo.replacePlaceHolder = function(obj, props) {
    var str = json.stringify(obj),
      m = str.match(/\$\{(\w)+\}/g),
      i;

    if (m === null) {
      return obj;
    }
    for (i = 0; i < m.length; i++) {
      var p = m[i].match(/(\w)+/g)[0];
      if (props[p]) {
        str = str.replace(m[i], props[p]);
      }
    }
    return json.parse(str);
  };

  mo.processUrlInAppConfig = function(url){
    if(!url){
      return;
    }
    if(url.startWith("data:") || url.startWith("http") || url.startWith("/")){
      return url;
    }else{
      return window.appInfo.appPath + url;
    }
  };

  mo.stripHTML = function (str){
    if (!str) {
      return str;
    }
    if (str.indexOf("<") > -1 && str.indexOf(">") > -1) {
      // this gets pretty slow if the string is long and has a < and no >
      var matchTag = /<(?:.|\s)*?>/g;
      return str.replace(matchTag, "");
    } else {
      return str;
    }
  };

  mo.setVerticalCenter = function(contextNode) {
    function doSet() {
      var nodes = query(".jimu-vcenter-text", contextNode),
        h, ph;
      array.forEach(nodes, function(node) {
        h = html.getContentBox(node).h;
        html.setStyle(node, {
          lineHeight: h + "px"
        });
      }, this);

      nodes = query(".jimu-vcenter", contextNode);
      array.forEach(nodes, function(node) {
        h = html.getContentBox(node).h;
        ph = html.getContentBox(query(node).parent()[0]).h;
        html.setStyle(node, {
          marginTop: (ph - h) / 2 + "px"
        });
      }, this);
    }

    //delay sometime to let browser update dom
    setTimeout(doSet, 10);
  };

  /*
   *n: Number
   *fieldInfo: https://developers.arcgis.com/javascript/jshelp/intro_popuptemplate.html
   */
  mo.localizeNumberByFieldInfo = function(n, fieldInfo) {
    var fn = null;
    var p = lang.exists("format.places", fieldInfo) && fieldInfo.format.places;
    fn = mo.localizeNumber(n, {
      places: p
    });

    if (lang.exists("format.digitSeparator", fieldInfo) && !fieldInfo.format.digitSeparator) {
      return fn.toString().replace(new RegExp("\\" + nlsBundle.group, "g"), "");
    } else {
      return fn;
    }
  };

  /*
   *d: an instance of date or number
   (the numeric value corresponding to the time for the specified date according to universal time)
   *fieldInfo: https://developers.arcgis.com/javascript/jshelp/intro_popuptemplate.html
   */
  mo.localizeDateByFieldInfo = function(d, fieldInfo) {
    var fd = null;
    try {
      var data = {
        date: d instanceof Date ? d.getTime() : d
      };
      var dateFormat = lang.exists("format.dateFormat", fieldInfo) ?
        fieldInfo.format.dateFormat : "longMonthDayYear";

      var substOptions = {
        dateFormat: {
          properties: ["date"],
          formatter: "DateFormat" + PopupTemplate.prototype._dateFormats[dateFormat]
        }
      };
      fd = esriLang.substitute(data, "${date}", substOptions);
    }catch (err) {
      console.error(err);
      fd = d;
    }

    return fd;
  };

  /*
   *Optional
   *An object with the following properties:
   *pattern (String, optional):
   *override formatting pattern with this string. Default value is based on locale.
   Overriding this property will defeat localization. Literal characters in patterns
   are not supported.
   *type (String, optional):
   *choose a format type based on the locale from the following: decimal, scientific
   (not yet supported), percent, currency. decimal by default.
   *places (Number, optional):
   *fixed number of decimal places to show. This overrides any information in the provided pattern.
   *round (Number, optional):
   *5 rounds to nearest .5; 0 rounds to nearest whole (default). -1 means do not round.
   *locale (String, optional):
   *override the locale used to determine formatting rules
   *fractional (Boolean, optional):
   *If false, show no decimal places, overriding places and pattern settings.
   */
  mo.localizeNumber = function(num, options){
    var decimalStr = num.toString().split(".")[1] || "",
      decimalLen = decimalStr.length;
    var _pattern = "";
    var places = options && isFinite(options.places) && options.places;
    if (places > 0 || decimalLen > 0) {
      var patchStr = Array.prototype.join.call({
        length: places > 0 ? (places + 1) : decimalLen
      }, "0");
      _pattern = "#,###,###,##0.0" + patchStr;
    }else {
      _pattern = "#,###,###,##0";
    }

    var _options = {
      locale: config.locale,
      pattern: _pattern
    };
    lang.mixin(_options, options || {});

    try {
      var fn = dojoNumber.format(num, _options);
      return fn;
    } catch (err) {
      console.error(err);
      return num.toLocaleString();
    }
  };

  mo.combineRadioCheckBoxWithLabel = function(inputDom, labelDom){
    var isValidInput = false;
    if(inputDom && inputDom.nodeType === 1 && inputDom.tagName.toLowerCase() === "input"){
      var inputType = inputDom.getAttribute("type") || "";
      inputType = inputType.toLowerCase();
      if(inputType === "radio" || inputType === "checkbox"){
        isValidInput = true;
      }
    }
    var isValidLabel = false;
    if(labelDom && labelDom.nodeType === 1 && labelDom.tagName.toLowerCase() === "label"){
      isValidLabel = true;
    }
    if(isValidInput && isValidLabel){
      var inputId = inputDom.getAttribute("id");
      if(!inputId){
        inputId = "input_" + mo.getRandomString();
        inputDom.setAttribute("id", inputId);
      }
      labelDom.setAttribute("for", inputId);
      html.setStyle(labelDom, "cursor", "pointer");
    }
  };

  //return handle array, the handles can be owned by widget
  mo.groupRadios = function(radios, /*optional*/ listener){
    var handles = [];
    var name = "radiogroup_" + mo.getRandomString();
    array.forEach(radios, function(radio){
      radio.name = name;
      if(listener){
        var handle = on(radio, "change", listener);
        handles.push(handle);
      }
    });
    return handles;
  };

  mo.convertExtentToPolygon = function(extent){
    //order: left-top right-top right-bottom left-bottom left-top
    var xLeft = extent.xmin;
    var xRight = extent.xmax;
    var yBottom = extent.ymin;
    var yTop = extent.ymax;

    var polygon = new Polygon({
      "rings": [
        [
          [xLeft, yTop],
          [xRight, yTop],
          [xRight, yBottom],
          [xLeft, yBottom],
          [xLeft, yTop]
        ]
      ],
      "spatialReference": extent.toJson()
    });
    return polygon;
  };

  mo.getGeometryCenter = function (geometry) {
    switch (geometry.type) {
      case "point":
        return geometry;

      case "polyline":
        var path = geometry.paths[0];
        var pointCount = path.length;
        return geometry.getPoint(0, Math.floor(pointCount / 2));

      case "polygon":
        return geometry.getCentroid();

      case "extent":
        return geometry.getCenter();

    }

  };

  mo.createLayer = function (layerConfig) {
    var layerMap = {
      "tiled": "esri/layers/ArcGISTiledMapServiceLayer",
      "dynamic": "esri/layers/ArcGISDynamicMapServiceLayer",
      "feature": "esri/layers/FeatureLayer",
      "ChengDiDynamic": "jimu/CustomLayers/ChengDiDynamicMapServiceLayer"
    };
    
    var type = layerConfig.type;
    require([layerMap[type]], lang.hitch(this, function (layerClass) {
      
    }));
  };

  mo.getRandomString = function() {
    var str = Math.random().toString();
    str = str.slice(2, str.length);
    return str;
  };

  var fileAPIJsStatus = "unload"; // unload, loading, loaded
  function _loadFileAPIJs(prePath, cb) {
    prePath = prePath || "";
    var loaded = 0,
      completeCb = function() {
        loaded++;
        if (loaded === tests.length) {
          cb();
        }
      },
      tests = [{
        test: window.File && window.FileReader && window.FileList && window.Blob ||
        !mo.file.isEnabledFlash(),
        failure: [
          prePath + "libs/polyfills/fileAPI/FileAPI.js"
        ],
        callback: function() {
          completeCb();
        }
      }];

    for (var i = 0; i < tests.length; i++) {
      testLoad(tests[i]);
    }
  }

  mo.file = {
    loadFileAPI: function() {
      var def = new Deferred();
      if (fileAPIJsStatus === "unload") {
        var prePath = !!window.isBuilder ? "stemapp/" : "";
        window.FileAPI = {
          debug: false,
          flash: true,
          staticPath: prePath + "libs/polyfills/fileAPI/",
          flashUrl: prePath + "libs/polyfills/fileAPI/FileAPI.flash.swf",
          flashImageUrl: prePath + "libs/polyfills/fileAPI/FileAPI.flash.image.swf"
        };

        _loadFileAPIJs(prePath, lang.hitch(this, function() {
          fileAPIJsStatus = "loaded";
          def.resolve();
        }));
        fileAPIJsStatus = "loading";
      } else if (fileAPIJsStatus === "loaded"){
        def.resolve();
      }

      return def;
    },
    supportHTML5: function() {
      if (window.File && window.FileReader && window.FileList && window.Blob) {
        return true;
      } else {
        return false;
      }
    },
    supportFileAPI: function() {
      if (has("safari") && has("safari") < 6) {
        return false;
      }
      if (window.FileAPI && window.FileAPI.readAsDataURL) {
        return true;
      }
      return false;
    },
    isEnabledFlash: function(){
      var swf = null;
      if (document.all) {
        try{
          swf = new ActiveXObject("ShockwaveFlash.ShockwaveFlash");
        }catch(e) {
          swf = null;
        }
      } else {
        if (navigator.plugins && navigator.plugins.length > 0) {
          swf = navigator.plugins["Shockwave Flash"];
        }
      }
      return !!swf;
    },
    containSeparator: function(path) {
      if (path.indexOf("/") >= 0) {
        return true;
      } else {
        if (path.indexOf("\\") >= 0) {
          return true;
        } else {
          return false;
        }
      }
    },
    getNameFromPath: function(path) {
      var separator = "";
      if (path.indexOf("/") >= 0) {
        separator = "/";
      } else {
        separator = "\\";
      }
      var segment = path.split(separator);
      if (segment.length > 0) {
        return segment[segment.length - 1];
      } else {
        return null;
      }

    },
    getFolderFromPath: function(path) {
      return path.substr(0, path.length - mo.file.getNameFromPath(path).length);
    },
    /********
     * read file by HTML5 API.
     *
     * parameters:
     * file: the file will be read.
     * filter: file type filter, files which don"t match the filter will not be read and
     return false.
     * maxSize: file size which exceeds the size will return false;
     * cb: the callback function when file is read completed, signature: (err, fileName, fileData)
     */
    readFile: function(fileEvt, filter, maxSize, cb) {
      if (this.supportHTML5()) {
        var file = fileEvt.target.files[0];
        if (!file) {
          return;
        }
        // Only process image files.
        if (!file.type.match(filter)) {
          // cb("Invalid file type.");
          cb({
            errCode: "invalidType"
          });
          return;
        }

        if (file.size >= maxSize) {
          // cb("File size cannot exceed  " + Math.floor(maxSize / 1024) + "KB.");
          cb({
            errCode: "exceed"
          });
          return;
        }

        var reader = new FileReader();
        // Closure to capture the file information.
        reader.onload = function(e) {
          cb(null, file.name, e.target.result);
        };
        // Read in the image file as a data URL.
        reader.readAsDataURL(file);
      } else if (this.supportFileAPI()) {
        var files = window.FileAPI.getFiles(fileEvt);

        // Only process image files.
        if (!files[0].type.match(filter)) {
          // cb("Invalid file type.");
          cb({
            errCode: "invalidType"
          });
          return;
        }

        if (files[0].size >= maxSize) {
          // cb("File size cannot exceed  " + Math.floor(maxSize / 1048576) + "M.");
          cb({
            errCode: "exceed"
          });
          return;
        }

        window.FileAPI.readAsDataURL(files[0], function(evt) {
          if (evt && evt.result) {
            cb(null, files[0].name, evt.result);
          } else {
            cb({
              errCode: "readError"
            });
          }
        });
      }
    }
  };

  mo.getAncestorDom = function(child, verifyFunc,
                               /*HTMLElement|Number optional */ maxLoopSizeOrDom) {
    if (child && child.nodeType === 1) {
      if (verifyFunc && typeof verifyFunc === "function") {
        var maxLoopSize = 100;
        var maxLoopDom = document.body;

        if (maxLoopSizeOrDom) {
          if (typeof maxLoopSizeOrDom === "number") {
            //Number
            maxLoopSizeOrDom = parseInt(maxLoopSizeOrDom, 10);
            if (maxLoopSizeOrDom > 0) {
              maxLoopSize = maxLoopSizeOrDom;
            }
          } else if (maxLoopSizeOrDom.nodeType === 1) {
            //HTMLElement
            maxLoopDom = maxLoopSizeOrDom;
          }
        }

        var loop = 0;
        while (child.parentNode && loop < maxLoopSize &&
        html.isDescendant(child.parentNode, maxLoopDom)) {
          if (verifyFunc(child.parentNode)) {
            return child.parentNode;
          }
          child = child.parentNode;
          loop++;
        }
      }
    }
    return null;
  };

  return mo;

});