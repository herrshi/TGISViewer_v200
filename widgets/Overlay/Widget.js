/**
 * Created by herrshi on 2017/7/4.
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/query",
  "dojo/dom-construct",
  "jimu/BaseWidget",
  "jimu/utils",
  "esri/graphic",
  "esri/layers/GraphicsLayer",
  "esri/geometry/jsonUtils",
  "esri/geometry/webMercatorUtils",
  "esri/symbols/jsonUtils",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/TextSymbol",
  "esri/renderers/SimpleRenderer",
  "esri/renderers/UniqueValueRenderer",
  "esri/Color",
  "esri/symbols/Font",
  "esri/InfoTemplate"
], function(
  declare,
  lang,
  array,
  topic,
  query,
  domConstruct,
  BaseWidget,
  jimuUtils,
  Graphic,
  GraphicsLayer,
  geometryJsonUtils,
  WebMercatorUtils,
  symbolJsonUtils,
  SimpleLineSymbol,
  SimpleFillSymbol,
  SimpleMarkerSymbol,
  PictureMarkerSymbol,
  TextSymbol,
  SimpleRenderer,
  UniqueValueRenderer,
  Color,
  Font,
  InfoTemplate
) {
  var _jimuMarkerStyleToEsriStyle = {
    circle: SimpleMarkerSymbol.STYLE_CIRCLE,
    cross: SimpleMarkerSymbol.STYLE_CROSS,
    diamond: SimpleMarkerSymbol.STYLE_DIAMOND,
    square: SimpleMarkerSymbol.STYLE_SQUARE,
    x: SimpleMarkerSymbol.STYLE_X
  };

  var _jimuPolylineStyleToEsriStyle = {
    solid: SimpleLineSymbol.STYLE_SOLID,
    dash: SimpleLineSymbol.STYLE_DASH,
    dashdot: SimpleLineSymbol.STYLE_DASHDOT,
    dashdotdot: SimpleLineSymbol.STYLE_DASHDOTDOT,
    dot: SimpleLineSymbol.STYLE_DOT,
    null: SimpleLineSymbol.STYLE_NULL
  };

  var _jimuPolygonStyleToEsriStyle = {
    backwarddiagonal: SimpleFillSymbol.STYLE_BACKWARD_DIAGONAL,
    cross: SimpleFillSymbol.STYLE_CROSS,
    diagonalcross: SimpleFillSymbol.STYLE_DIAGONAL_CROSS,
    forwarddiagonal: SimpleFillSymbol.STYLE_FORWARD_DIAGONAL,
    horizontal: SimpleFillSymbol.STYLE_HORIZONTAL,
    null: SimpleFillSymbol.STYLE_NULL,
    solid: SimpleFillSymbol.STYLE_SOLID,
    vertical: SimpleFillSymbol.STYLE_VERTICAL
  };

  var clazz = declare([BaseWidget], {
    name: "Overlay",
    graphicsLayer: null,
<<<<<<< HEAD
    toolTips: [],
=======
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
    postCreate: function() {
      this.inherited(arguments);

      this.graphicsLayer = new GraphicsLayer();
      this.map.addLayer(this.graphicsLayer);

      this._setMapMoveEvent();
      topic.subscribe(
        "addOverlays",
        lang.hitch(this, this.onTopicHandler_addOverlays)
      );
      topic.subscribe(
        "addOverlaysJson",
        lang.hitch(this, this.onTopicHandler_addOverlaysJson)
      );
      topic.subscribe(
        "deleteOverlays",
        lang.hitch(this, this.onTopicHandler_deleteOverlays)
      );
      topic.subscribe(
        "showOverlays",
        lang.hitch(this, this.onTopicHandler_showOverlays)
      );
      topic.subscribe(
        "hideOverlays",
        lang.hitch(this, this.onTopicHandler_hideOverlays)
      );
      topic.subscribe(
        "deleteAllOverlays",
        lang.hitch(this, this.onTopicHandler_deleteAllOverlays)
      );
      topic.subscribe(
        "showAllOverlays",
        lang.hitch(this, this.onTopicHandler_showAllOverlays)
      );
      topic.subscribe(
        "hideAllOverlays",
        lang.hitch(this, this.onTopicHandler_hideAllOverlays)
      );

      topic.subscribe(
        "addPoints",
        lang.hitch(this, this.onTopicHandler_addPoints)
      );
      topic.subscribe(
        "deleteAllPoints",
        lang.hitch(this, this.onTopicHandler_deleteAllPoints)
      );

      topic.subscribe(
        "addPolylines",
        lang.hitch(this, this.onTopicHandler_addPolylines)
      );
      topic.subscribe(
        "deleteAllPolylines",
        lang.hitch(this, this.onTopicHandler_deleteAllPolylines)
      );

      topic.subscribe(
        "addPolygons",
        lang.hitch(this, this.onTopicHandler_addPolygons)
      );
      topic.subscribe(
        "deleteAllPolygons",
        lang.hitch(this, this.onTopicHandler_deleteAllPolygons)
      );

      topic.subscribe(
        "findFeature",
        lang.hitch(this, this.onTopicHandler_findFeature)
      );
    },
    _setMapMoveEvent: function() {
      this.graphicsLayer.on(
        "mouse-over",
        lang.hitch(this, function(event) {
          var graphic = event.graphic;
          if (graphic && graphic.islabel !== true) {
            var id, type;
            if (graphic.attributes) {
              var featureAttributes = graphic.attributes;
              for (var fieldName in featureAttributes) {
                //过滤掉prototype
                if (featureAttributes.hasOwnProperty(fieldName)) {
                  //做join时，字段名会带上图层名，用indexOf来判断
                  if (
                    fieldName.indexOf("DEVICEID") > -1 ||
                    fieldName.indexOf("BM_CODE") > -1 ||
                    fieldName.indexOf("FEATUREID") > -1
                  ) {
                    id = featureAttributes[fieldName];
                  }
                  if (
                    fieldName.indexOf("DEVICETYPE") > -1 ||
                    fieldName.indexOf("FEATURETYPE") > -1
                  ) {
                    type = featureAttributes[fieldName];
                  }
                }
              }
            }
            id = id || graphic.id;
            type = type || graphic.type;
            if (type !== undefined && id !== undefined) {
              //只传type和id
              if (
                typeof moveGisDeviceInfo !== "undefined" &&
                moveGisDeviceInfo instanceof Function
              ) {
                moveGisDeviceInfo(type, id);
              }
            }
            var ar = this.toolTips.find(function(el) {
              return el.type == type;
            });
            if (ar && ar.islabel === undefined) {
              if (ar.label) {
                topic.publish("showToolTip", {
                  graphic: graphic,
                  label: ar.label
                });
              }
              if (ar.content) {
                topic.publish("showToolTip", {
                  graphic: graphic,
                  context: ar.content
                });
              }
            }
            //传完整信息
            if (
              typeof moveGisDeviceDetailInfo !== "undefined" &&
              moveGisDeviceDetailInfo instanceof Function
            ) {
              moveGisDeviceDetailInfo({
                type: type,
                id: id,
                label: graphic.getLayer().label,
                graphic: graphic.geometry.spatialReference.isWebMercator()
                  ? new Graphic(
                      WebMercatorUtils.webMercatorToGeographic(
                        graphic.geometry
                      ),
                      graphic.symbol,
                      graphic.attributes
                    )
                  : graphic
              });
            }
          }
          //dynamicLayer
          else {
          }
        })
      );

      this.graphicsLayer.on(
        "mouse-out",
        lang.hitch(this, function(event) {
          topic.publish("clearToolTip");
          if (
            typeof moveOutGisDeviceInfo !== "undefined" &&
            moveOutGisDeviceInfo instanceof Function
          ) {
            moveOutGisDeviceInfo();
          }
        })
      );
    },
    _getESRIColor: function(color, alpha, defaultColor) {
      //color如果是[r,g,b,a]形式
      if (color instanceof Array && color.length === 4) {
        //symbol.toJson方法有bug, 最后一位的a会转成0--255, 而不是0--1
        if (color[3] > 1) {
          color[3] = color[3] / 255;
        }
        return color;
      } else {
        //其他情况, 将color和alpha组合为[r, g, b, a]形式
        var esriColor = color ? new Color(color).toRgb() : defaultColor;
        esriColor[3] = !isNaN(alpha) ? alpha : 1;
        return esriColor;
      }
    },

    _getEsriPointSymbol: function(symbolObj) {
      var symbol;
      if (symbolObj) {
        switch (symbolObj.type.toLowerCase()) {
          //picture marker Symbol
          case "picture":
          case "esriPMS".toLowerCase():
            symbol = new PictureMarkerSymbol();
            symbol.url = symbolObj.url;
            if (!isNaN(symbolObj.width)) {
              symbol.width = symbolObj.width;
            }
            if (!isNaN(symbolObj.height)) {
              symbol.height = symbolObj.height;
            }
            symbol.angle = !isNaN(symbolObj.angle) ? symbolObj.angle : 0;
            symbol.xoffset = !isNaN(symbolObj.xoffset) ? symbolObj.xoffset : 0;
            symbol.yoffset = !isNaN(symbolObj.yoffset) ? symbolObj.yoffset : 0;
            break;

          //simple marker symbol
          case "marker":
          case "esriSMS".toLowerCase():
            symbol = new SimpleMarkerSymbol();
            symbol.style = symbolObj.style
              ? _jimuMarkerStyleToEsriStyle[symbolObj.style.toLowerCase()] ||
                SimpleMarkerSymbol.STYLE_CIRCLE
              : SimpleMarkerSymbol.STYLE_CIRCLE;
            symbol.color = this._getESRIColor(
              symbolObj.color,
              symbolObj.alpha,
              [0, 0, 0, 1]
            );
            symbol.size = !isNaN(symbolObj.size) ? symbolObj.size : 8;
            symbol.angle = !isNaN(symbolObj.angle) ? symbolObj.angle : 0;
            symbol.xoffset = !isNaN(symbolObj.xoffset) ? symbolObj.xoffset : 0;
            symbol.yoffset = !isNaN(symbolObj.yoffset) ? symbolObj.yoffset : 0;
            symbol.outline = this._getESRILineSymbol(symbolObj.outline);
            break;
        }
      } else {
        //默认为黑色圆点
        symbol = new SimpleMarkerSymbol(
          SimpleMarkerSymbol.STYLE_CIRCLE,
          8,
          new SimpleLineSymbol(new Color([255, 255, 255, 1]), 1),
          new Color([0, 0, 0, 1])
        );
      }

      return symbol;
    },

    _getESRILineSymbol: function(symbolObj) {
      var symbol;
      if (symbolObj) {
        symbol = new SimpleLineSymbol();
        symbol.style = symbolObj.style
          ? _jimuPolylineStyleToEsriStyle[symbolObj.style.toLowerCase()] ||
            SimpleLineSymbol.STYLE_SOLID
          : SimpleLineSymbol.STYLE_SOLID;
        symbol.color = this._getESRIColor(symbolObj.color, symbolObj.alpha, [
          0,
          0,
          0,
          1
        ]);
        symbol.width = !isNaN(symbolObj.width) ? symbolObj.width : 2;
      } else {
        symbol = new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color([0, 0, 0, 1]),
          2
        );
      }

      return symbol;
    },

    _getESRIPolygonSymbol: function(symbolObj) {
      var symbol;

      if (symbolObj) {
        symbol = new SimpleFillSymbol();
        symbol.style = symbolObj.style
          ? _jimuPolygonStyleToEsriStyle[symbolObj.style.toLowerCase()] ||
            SimpleFillSymbol.STYLE_SOLID
          : SimpleFillSymbol.STYLE_SOLID;
        symbol.color = this._getESRIColor(symbolObj.color, symbolObj.alpha, [
          255,
          0,
          0,
          1
        ]);
        symbol.outline = this._getESRILineSymbol(symbolObj.outline);
      } else {
        symbol = new SimpleFillSymbol(
          SimpleFillSymbol.STYLE_SOLID,
          new SimpleLineSymbol(
            SimpleLineSymbol.STYLE_SOLID,
            new Color([0, 0, 0, 1], 2)
          ),
          new Color([255, 0, 0, 0.5])
        );
      }

      return symbol;
    },
    _getESRITextSymbol: function(symbolObj) {
      var symbol;
      if (symbolObj) {
        symbol = symbolJsonUtils.fromJson(symbolObj);
      } else {
        symbol = new TextSymbol()
          .setColor(new Color([0, 0, 0]))
          .setAlign(Font.ALIGN_START)
          .setFont(new Font("12pt").setWeight(Font.WEIGHT_NORMAL));
      }

      return symbol;
    },
    _deleteGraphicByGeometryType: function(geometryType) {
      for (var i = 0; i < this.graphicsLayer.graphics.length; i++) {
        var graphic = this.graphicsLayer.graphics[i];
        if (graphic.geometry.type === geometryType) {
          this.graphicsLayer.remove(graphic);
          i--;
        }
      }
    },

    onTopicHandler_addPoints: function(params) {
      var pointParams = JSON.parse(params);
      var points = pointParams.points;
      array.forEach(
        points,
        function(pointObj) {
          var id = pointObj.id;
          var type = pointObj.type;
          var fields = pointObj.fields;
          var geometryObj = pointObj.geometry;
          var symbolObj = pointObj.symbol;

          var geometry = geometryJsonUtils.fromJson(geometryObj);
          if (this.map.spatialReference.isWebMercator()) {
            geometry = WebMercatorUtils.geographicToWebMercator(geometry);
          }
          var symbol = this._getEsriPointSymbol(symbolObj);
          var isExist = false;
          for (var i = 0; i < this.graphicsLayer.graphics.length; i++) {
            var graphic = this.graphicsLayer.graphics[i];
            if (
              (id === undefined && type === graphic.type) ||
              (type === undefined && id === graphic.id) ||
              (id !== undefined &&
                id === graphic.id &&
                type !== undefined &&
                type === graphic.type)
            ) {
              graphic.setGeometry(geometry);
              isExist = true;
              break;
            }
          }
          if (!isExist) {
            var graphic = new Graphic(geometry, symbol, fields);
            graphic.id = id;
            graphic.type = type;
            this.graphicsLayer.add(graphic);
          }
        },
        this
      );
    },

    onTopicHandler_deleteAllPoints: function() {
      this._deleteGraphicByGeometryType("point");
    },

    onTopicHandler_addPolylines: function(params) {
      var lineParams = JSON.parse(params);
      var lines = lineParams.lines;

      array.forEach(
        lines,
        function(lineObj) {
          var id = lineObj.id;
          var type = lineObj.type;
          var fields = lineObj.fields;
          var geometryObj = lineObj.geometry;
          var symbolObj = lineObj.symbol;

          var geometry = geometryJsonUtils.fromJson(geometryObj);
          if (this.map.spatialReference.isWebMercator()) {
            geometry = WebMercatorUtils.geographicToWebMercator(geometry);
          }

          var symbol = this._getESRILineSymbol(symbolObj);

          var isExist = false;
          for (var i = 0; i < this.graphicsLayer.graphics.length; i++) {
            var graphic = this.graphicsLayer.graphics[i];
            if (
              (id === undefined && type === graphic.type) ||
              (type === undefined && id === graphic.id) ||
              (id !== undefined &&
                id === graphic.id &&
                type !== undefined &&
                type === graphic.type)
            ) {
              graphic.setGeometry(geometry);
              isExist = true;
              break;
            }
          }
          if (!isExist) {
            var graphic = new Graphic(geometry, symbol, fields);
            graphic.id = id;
            graphic.type = type;
            this.graphicsLayer.add(graphic);
          }
        },
        this
      );
    },

    onTopicHandler_deleteAllPolylines: function() {
      this._deleteGraphicByGeometryType("polyline");
    },

    onTopicHandler_addPolygons: function(params) {
      var polygonParams = JSON.parse(params);
      var polygons = polygonParams.polygons;

      array.forEach(
        polygons,
        function(polygonObj) {
          var id = polygonObj.id;
          var type = polygonObj.type;
          var fields = polygonObj.fields;
          var geometryObj = polygonObj.geometry;
          var symbolObj = polygonObj.symbol;

          var geometry = geometryJsonUtils.fromJson(geometryObj);
          if (this.map.spatialReference.isWebMercator()) {
            geometry = WebMercatorUtils.geographicToWebMercator(geometry);
          }

          var symbol = this._getESRIPolygonSymbol(symbolObj);

          var isExist = false;
          for (var i = 0; i < this.graphicsLayer.graphics.length; i++) {
            var graphic = this.graphicsLayer.graphics[i];
            if (
              (id === undefined && type === graphic.type) ||
              (type === undefined && id === graphic.id) ||
              (id !== undefined &&
                id === graphic.id &&
                type !== undefined &&
                type === graphic.type)
            ) {
              graphic.setGeometry(geometry);
              isExist = true;
              break;
            }
          }
          if (!isExist) {
            var graphic = new Graphic(geometry, symbol, fields);
            graphic.id = id;
            graphic.type = type;
            this.graphicsLayer.add(graphic);
          }
        },
        this
      );
    },

    onTopicHandler_deleteAllPolygons: function() {
      this._deleteGraphicByGeometryType("polygon");
    },

    /**根据graphic的属性生成弹出框*/
    _getInfoWindowContent: function(graphic) {
      var content = "";
      //键值对
      for (var fieldName in graphic.attributes) {
        if (graphic.attributes.hasOwnProperty(fieldName)) {
          content +=
            "<b>" +
            fieldName +
            ": </b>" +
            graphic.attributes[fieldName] +
            "<br>";
        }
      }
      //去掉最后的<br>
      content = content.substring(0, content.lastIndexOf("<br>"));

      //按钮
      if (graphic.buttons !== undefined) {
        content += "<hr>";
        array.forEach(graphic.buttons, function(buttonConfig) {
          content +=
            "<button type='button' class='btn btn-primary btn-sm' onclick='mapFeatureClicked(" +
            '"' +
            buttonConfig.type +
            '", "' +
            graphic.id +
            '"' +
            ")'>" +
            buttonConfig.label +
            "</button>  ";
        });
      }

      return content;
    },

    onTopicHandler_addOverlays: function(params, resolve, reject) {
      var overlayParams = JSON.parse(params);
      //需要抽稀的在ReductionOverlay中处理
      if (
        overlayParams.featureReduction &&
        !!overlayParams.featureReduction.enable
      ) {
        return;
      }
      var overlays = overlayParams.overlays;

      var showPopup = overlayParams.showPopup === true;
      var autoPopup = overlayParams.autoPopup === true;
      var showToolTip = overlayParams.showToolTip === true;
<<<<<<< HEAD
      var moveToolTip = overlayParams.moveToolTip === true;
      var toolTipLabel = overlayParams.toolTipLabel;
      var toolTipContent = overlayParams.toolTipContent;
      var defaultVisible = overlayParams.defaultVisible !== false;
      var showLabels = overlayParams.showLabels === true;
      var defaultTextSymbol = overlayParams.defaultTextSymbol;
      var labelInfo = overlayParams.labelInfo;

      var features = [];
=======
      var defaultVisible = overlayParams.defaultVisible !== false;

>>>>>>> 1e93de92ca458248b8448852db9063820b708052
      array.forEach(
        overlays,
        function(overlayObj) {
          var id = overlayObj.id;
          var type = overlayObj.type || overlayParams.defaultType;
          var fields = overlayObj.fields;
          var geometryObj = overlayObj.geometry;
          var symbolObj = overlayObj.symbol || overlayParams.defaultSymbol;
          var buttons = overlayObj.buttons || overlayParams.defaultButtons;
          var visible =
            overlayObj.visible !== undefined
              ? overlayObj.visible
              : defaultVisible;

<<<<<<< HEAD
          if (moveToolTip) {
            var ar = this.toolTips.find(function(el) {
              return el.type == type;
            });
            if (ar == undefined) {
              this.toolTips.push({
                type: type,
                label: toolTipLabel,
                content: toolTipContent
              });
            }
          }
=======
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
          var geometry = geometryJsonUtils.fromJson(geometryObj);
          if (this.map.spatialReference.isWebMercator()) {
            geometry = WebMercatorUtils.geographicToWebMercator(geometry);
          }

          var symbol;
          switch (geometry.type) {
            case "point":
              symbol = this._getEsriPointSymbol(symbolObj);
              break;

            case "polyline":
              symbol = this._getESRILineSymbol(symbolObj);
              break;

            case "polygon":
              symbol = this._getESRIPolygonSymbol(symbolObj);
              break;
          }
          var isExist = false;
          for (var i = 0; i < this.graphicsLayer.graphics.length; i++) {
            var graphic = this.graphicsLayer.graphics[i];
            if (id !== undefined && id === graphic.id) {
              graphic.setGeometry(geometry);
              isExist = true;
              break;
            }
          }
          if (!isExist) {
            var graphic = new Graphic(geometry, symbol, fields);
            graphic.id = id;
            graphic.type = type;
            graphic.buttons = buttons;
            graphic.visible = visible;
            if (showToolTip) {
              topic.publish("showToolTip", {
                graphic: graphic,
<<<<<<< HEAD
                label: toolTipLabel,
                offset: 20
              });
            }
            features.push(graphic);
=======
                label: "卡口",
                offset: 20
              });
            }

            var templateConfig =
              overlayObj.infoTemplate || overlayParams.defaultInfoTemplate;
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
            if (showPopup) {
              if (templateConfig === undefined) {
                graphic.infoTemplate = new InfoTemplate({
                  content: this._getInfoWindowContent(graphic)
                });
              } else {
                var infoTemplate = new InfoTemplate();
                infoTemplate.setTitle(
                  templateConfig.title === "" ? null : templateConfig.title
                );
                infoTemplate.setContent(templateConfig.content);
                graphic.setInfoTemplate(infoTemplate);
                //this.map.infoWindow.resize(200,90);
              }
            }
            if (autoPopup) {
              this.map.infoWindow.setContent(
                this._getInfoWindowContent(graphic)
              );
              this.map.infoWindow.show(
                jimuUtils.getGeometryCenter(graphic.geometry)
              );
            }
            this.graphicsLayer.add(graphic);
          }
        },
        this
      );
      this.publishData(this.graphicsLayer.graphics);
<<<<<<< HEAD
      if (showLabels) {
        this.addOverlaysLabel(features, defaultTextSymbol, labelInfo);
      }
=======
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
      if (resolve) {
        resolve();
      }
    },
    addOverlaysLabel: function(features, textSymbol, labelInfo) {
      features.forEach(function(graphic) {
        var textsymbol = this._getESRITextSymbol(textSymbol);
        var text = labelInfo;
        for (var str in graphic.attributes) {
          text = text.replace("{" + str + "}", graphic.attributes[str]);
        }
        textsymbol.text = text;
        var point = jimuUtils.getGeometryCenter(graphic.geometry);
        var textGraphic = new Graphic(point, textsymbol);
        textGraphic.id = graphic.id;
        textGraphic.type = graphic.type;
        textGraphic.visible = graphic.visible;
        textGraphic.islabel = true;
        this.graphicsLayer.add(textGraphic);
      }, this);
    },
    onTopicHandler_addOverlaysJson: function(params, resolve, reject) {
      var overlayParams = JSON.parse(params);
      var JsonUrl = overlayParams.url;
      var type = overlayParams.type;
      $.get(
        JsonUrl,
        lang.hitch(this, function(data, status) {
          if (status === "success") {
            var features = data.features;
            var overlays = [];
            features.forEach(function(feature) {
              overlays.push({
                type: feature.attributes.FEATURETYPE
                  ? feature.attributes.FEATURETYPE
                  : type,
                id: feature.attributes.FEATUREID,
                geometry: feature.geometry,
                fields: feature.attributes
              });
            });
            var jsonObj = {};
            for (var field in overlayParams) {
              jsonObj[field] = overlayParams[field];
            }
            jsonObj.overlays = overlays;

            this.onTopicHandler_addOverlays(
              JSON.stringify(jsonObj),
              resolve,
              reject
            );
          }
        }),
        "json"
      );
    },
    onTopicHandler_deleteOverlays: function(params) {
      var types = params.types || [];
      var ids = params.ids || [];
      for (var i = 0; i < this.graphicsLayer.graphics.length; i++) {
        var graphic = this.graphicsLayer.graphics[i];
        if (
          //只判断type
          (types.length > 0 &&
            ids.length === 0 &&
            array.indexOf(types, graphic.type) >= 0) ||
          //只判断id
          (types.length === 0 &&
            ids.length > 0 &&
            array.indexOf(ids, graphic.id) >= 0) ||
          //type和id都要判断
          (types.length > 0 &&
            ids.length > 0 &&
            array.indexOf(types, graphic.type) >= 0 &&
            array.indexOf(ids, graphic.id) >= 0)
        ) {
          this.graphicsLayer.remove(graphic);
          i--;
        }
      }
    },

    onTopicHandler_showOverlays: function(params) {
      var types = params.types || [];
      var ids = params.ids || [];
      for (var i = 0; i < this.graphicsLayer.graphics.length; i++) {
        var graphic = this.graphicsLayer.graphics[i];
        if (
          //只判断type
          (types.length > 0 &&
            ids.length === 0 &&
            array.indexOf(types, graphic.type) >= 0) ||
          //只判断id
          (types.length === 0 &&
            ids.length > 0 &&
            array.indexOf(ids, graphic.id) >= 0) ||
          //type和id都要判断
          (types.length > 0 &&
            ids.length > 0 &&
            array.indexOf(types, graphic.type) >= 0 &&
            array.indexOf(ids, graphic.id) >= 0)
        ) {
          graphic.visible = true;
        }
      }
      this.graphicsLayer.refresh();
    },

    onTopicHandler_hideOverlays: function(params) {
      var types = params.types || [];
      var ids = params.ids || [];
      for (var i = 0; i < this.graphicsLayer.graphics.length; i++) {
        var graphic = this.graphicsLayer.graphics[i];
        if (
          //只判断type
          (types.length > 0 &&
            ids.length === 0 &&
            array.indexOf(types, graphic.type) >= 0) ||
          //只判断id
          (types.length === 0 &&
            ids.length > 0 &&
            array.indexOf(ids, graphic.id) >= 0) ||
          //type和id都要判断
          (types.length > 0 &&
            ids.length > 0 &&
            array.indexOf(types, graphic.type) >= 0 &&
            array.indexOf(ids, graphic.id) >= 0)
        ) {
          graphic.visible = false;
        }
      }
      this.graphicsLayer.refresh();
    },

    onTopicHandler_deleteAllOverlays: function() {
      this.graphicsLayer.clear();
    },

    onTopicHandler_showAllOverlays: function() {
      this.graphicsLayer.setVisibility(true);
    },

    onTopicHandler_hideAllOverlays: function() {
      this.graphicsLayer.setVisibility(false);
    },

    onTopicHandler_findFeature: function(params) {
      var layerName = params.params.layerName || "";
      var ids = params.params.ids || "";
      var centerResult = params.params.centerResult || false;
      var find_blackGraphic;
      var find_blacknode;

      var callback = params.callback;

      for (var i = 0; i < this.graphicsLayer.graphics.length; i++) {
        var graphic = this.graphicsLayer.graphics[i];
        if (graphic.type === layerName && graphic.id === ids[0]) {
          if (callback) {
            callback(graphic);
          }
          if (centerResult) {
            this.map.centerAt(jimuUtils.getGeometryCenter(graphic.geometry));
          }
          if (graphic.geometry.type === "point") {
            // var sms = new SimpleMarkerSymbol({
            //   color: [0, 0, 0, 0],
            //   size: 12,
            //   type: "esriSMS",
            //   style: "esriSMSSquare",
            //   outline: {
            //     color: [0, 0, 0, 255],
            //     width: 1,
            //     type: "esriSLS",
            //     style: "esriSLSSolid"
            //   }
            // });
            // //sms.setColor(new Color([0, 0, 0, 0]));
            // if (graphic.symbol.type === "picturemarkersymbol") {
            //   sms.setSize(
            //     graphic.symbol.width > graphic.symbol.height
            //       ? graphic.symbol.width + 4
            //       : graphic.symbol.height + 4
            //   );
            // } else if (graphic.symbol.size !== undefined) {
            //   sms.setSize(graphic.symbol.size + 4);
            // } else {
            //   sms.setSize(16);
            // }
            // sms.setOffset(graphic.symbol.xoffset, graphic.symbol.yoffset);
            // find_blackGraphic = new Graphic(graphic.geometry, sms);
            // this.graphicsLayer.add(find_blackGraphic);
            // var find_blacknode = find_blackGraphic.getNode();
            //find_blacknode.setAttribute("data-highlight", "highlight");
          }
          var node = graphic.getNode();
          node.setAttribute("data-highlight", "highlight");
          // domConstruct.place(find_blacknode, node, "before"); // before/after
          setTimeout(function() {
            // if (find_blackGraphic !== undefined) {
            //   find_blackGraphic.getLayer().remove(find_blackGraphic);
            // }
            node.setAttribute("data-highlight", "");
          }, 5000);
        }
      }
    }
  });

  return clazz;
});
