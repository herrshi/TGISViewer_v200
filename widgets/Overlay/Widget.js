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
  "esri/renderers/SimpleRenderer",
  "esri/renderers/UniqueValueRenderer",
  "esri/Color",
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
  SimpleRenderer,
  UniqueValueRenderer,
  Color,
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
    postCreate: function() {
      this.inherited(arguments);

      this.graphicsLayer = new GraphicsLayer();
      this.map.addLayer(this.graphicsLayer);

      topic.subscribe(
        "addOverlays",
        lang.hitch(this, this.onTopicHandler_addOverlays)
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
      var defaultVisible = overlayParams.defaultVisible !== false;

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
                label: "卡口",
                offset: 20
              });
            }

            var templateConfig =
              overlayObj.infoTemplate || overlayParams.defaultInfoTemplate;
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
      if (resolve) {
        resolve();
      }
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
