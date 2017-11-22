/**
 * Created by herrshi on 2017/7/4.
 */
define([
  "dojo/_base/declare", 
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "jimu/BaseWidget",
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
  "esri/Color"
], function (
  declare, 
  lang,
  array,
  topic,
  BaseWidget,
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
  Color
) {
  var _jimuMarkerStyleToEsriStyle = {
    "circle": SimpleMarkerSymbol.STYLE_CIRCLE,
    "cross": SimpleMarkerSymbol.STYLE_CROSS,
    "diamond": SimpleMarkerSymbol.STYLE_DIAMOND,
    "square": SimpleMarkerSymbol.STYLE_SQUARE,
    "x": SimpleMarkerSymbol.STYLE_X
  };

  var _jimuPolylineStyleToEsriStyle = {
    "solid": SimpleLineSymbol.STYLE_SOLID,
    "dash": SimpleLineSymbol.STYLE_DASH,
    "dashdot": SimpleLineSymbol.STYLE_DASHDOT,
    "dashdotdot": SimpleLineSymbol.STYLE_DASHDOTDOT,
    "dot": SimpleLineSymbol.STYLE_DOT,
    "null": SimpleLineSymbol.STYLE_NULL
  };

  var _jimuPolygonStyleToEsriStyle = {
    "backwarddiagonal": SimpleFillSymbol.STYLE_BACKWARD_DIAGONAL,
    "cross": SimpleFillSymbol.STYLE_CROSS,
    "diagonalcross": SimpleFillSymbol.STYLE_DIAGONAL_CROSS,
    "forwarddiagonal": SimpleFillSymbol.STYLE_FORWARD_DIAGONAL,
    "horizontal": SimpleFillSymbol.STYLE_HORIZONTAL,
    "null": SimpleFillSymbol.STYLE_NULL,
    "solid": SimpleFillSymbol.STYLE_SOLID,
    "vertical": SimpleFillSymbol.STYLE_VERTICAL
  };

  var clazz = declare([BaseWidget], {
    name: "Overlay",
    graphicsLayer: null,
    
    postCreate: function () {
      this.inherited(arguments);

      this.graphicsLayer = new GraphicsLayer();
      this.map.addLayer(this.graphicsLayer);

      topic.subscribe("addOverlays", lang.hitch(this, this.onTopicHandler_addOverlays));
      topic.subscribe("deleteOverlays", lang.hitch(this, this.onTopicHandler_deleteOverlays));
      topic.subscribe("deleteAllOverlays", lang.hitch(this, this.onTopicHandler_deleteAllOverlays));

      topic.subscribe("addPoints", lang.hitch(this, this.onTopicHandler_addPoints));
      topic.subscribe("deleteAllPoints", lang.hitch(this, this.onTopicHandler_deleteAllPoints));

      topic.subscribe("addPolylines", lang.hitch(this, this.onTopicHandler_addPolylines));
      topic.subscribe("deleteAllPolylines", lang.hitch(this, this.onTopicHandler_deleteAllPolylines));

      topic.subscribe("addPolygons", lang.hitch(this, this.onTopicHandler_addPolygons));
      topic.subscribe("deleteAllPolygons", lang.hitch(this, this.onTopicHandler_deleteAllPolygons));
    },

    _getESRIColor: function (color, alpha, defaultColor) {
      //color如果是[r,g,b,a]形式
      if (color instanceof Array && color.length === 4) {
        //symbol.toJson方法有bug, 最后一位的a会转成0--255, 而不是0--1
        if (color[3] > 1) {
          color[3] = color[3] / 255;
        }
        return color;
      }
      //其他情况, 将color和alpha组合为[r, g, b, a]形式
      else {
        var esriColor = color ? new Color(color).toRgb() : defaultColor;
        esriColor[3] = !isNaN(alpha) ? alpha : 1;
        return esriColor;
      }
    },

    _getEsriPointSymbol: function (symbolObj) {
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
            symbol.style = symbolObj.style ? _jimuMarkerStyleToEsriStyle[symbolObj.style.toLowerCase()] || SimpleMarkerSymbol.STYLE_CIRCLE : SimpleMarkerSymbol.STYLE_CIRCLE;
            symbol.color = this._getESRIColor(symbolObj.color, symbolObj.alpha, [0, 0, 0, 1]);
            symbol.size = !isNaN(symbolObj.size) ? symbolObj.size : 8;
            symbol.angle = !isNaN(symbolObj.angle) ? symbolObj.angle : 0;
            symbol.xoffset = !isNaN(symbolObj.xoffset) ? symbolObj.xoffset : 0;
            symbol.yoffset = !isNaN(symbolObj.yoffset) ? symbolObj.yoffset : 0;
            symbol.outline = this._getESRILineSymbol(symbolObj.outline);
            break;
        }
      }
      //默认为黑色圆点
      else {
        symbol = new SimpleMarkerSymbol(
          SimpleMarkerSymbol.STYLE_CIRCLE,
          8,
          new SimpleLineSymbol(new Color([255, 255, 255, 1]), 1),
          new Color([0, 0, 0, 1]));
      }

      return symbol;
    },

    _getESRILineSymbol: function (symbolObj) {
      var symbol;
      if (symbolObj) {
        symbol = new SimpleLineSymbol();
        symbol.style = symbolObj.style ? _jimuPolylineStyleToEsriStyle[symbolObj.style.toLowerCase()] || SimpleLineSymbol.STYLE_SOLID : SimpleLineSymbol.STYLE_SOLID;
        symbol.color = this._getESRIColor(symbolObj.color, symbolObj.alpha, [0, 0, 0, 1]);
        symbol.width = !isNaN(symbolObj.width) ? symbolObj.width : 2;
      }
      else {
        symbol = new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color([0, 0, 0, 1]),
          2
        );
      }

      return symbol;
    },

    _getESRIPolygonSymbol: function (symbolObj) {
      var symbol;

      if (symbolObj) {
        symbol = new SimpleFillSymbol();
        symbol.style = symbolObj.style ? _jimuPolygonStyleToEsriStyle[symbolObj.style.toLowerCase()] || SimpleFillSymbol.STYLE_SOLID : SimpleFillSymbol.STYLE_SOLID;
        symbol.color = this._getESRIColor(symbolObj.color, symbolObj.alpha, [255, 0, 0, 1]);
        symbol.outline = this._getESRILineSymbol(symbolObj.outline);
      }
      else {
        symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
          new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 0, 1], 2)),
          new Color([255, 0, 0, 0.5]));
      }

      return symbol;
    },

    _deleteGraphicByGeometryType: function (geometryType) {
      for (var i = 0; i < this.graphicsLayer.graphics.length; i++) {
        var graphic = this.graphicsLayer.graphics[i];
        if (graphic.geometry.type === geometryType) {
          this.graphicsLayer.remove(graphic);
          i--;
        }
      }
    },

    onTopicHandler_addPoints: function (params) {
      var pointParams = JSON.parse(params);
      var points = pointParams.points;
      array.forEach(points, function (pointObj) {
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

        var graphic = new Graphic(geometry, symbol, fields);
        graphic.id = id;
        graphic.type = type;

        this.graphicsLayer.add(graphic);
      }, this);
    },

    onTopicHandler_deleteAllPoints: function () {
      this._deleteGraphicByGeometryType("point");
    },

    onTopicHandler_addPolylines: function (params) {
      var lineParams = JSON.parse(params);
      var lines = lineParams.lines;

      array.forEach(lines, function (lineObj) {
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

        var graphic = new Graphic(geometry, symbol, fields);
        graphic.id = id;
        graphic.type = type;

        this.graphicsLayer.add(graphic);
      }, this);

    },
    
    onTopicHandler_deleteAllPolylines: function () {
      this._deleteGraphicByGeometryType("polyline");
    },

    onTopicHandler_addPolygons: function (params) {
      var polygonParams = JSON.parse(params);
      var polygons = polygonParams.polygons;

      array.forEach(polygons, function (polygonObj) {
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

        var graphic = new Graphic(geometry, symbol, fields);
        graphic.id = id;
        graphic.type = type;

        this.graphicsLayer.add(graphic);
      }, this);
    },

    onTopicHandler_deleteAllPolygons: function () {
      this._deleteGraphicByGeometryType("polygon");
    },

    onTopicHandler_addOverlays: function (params) {
      var overlayParams = JSON.parse(params);
      var overlays = overlayParams.overlays;

      array.forEach(overlays, function (overlayObj) {
        var id = overlayObj.id;
        var type = overlayObj.type;
        var fields = overlayObj.fields;
        var geometryObj = overlayObj.geometry;
        var symbolObj = overlayObj.symbol;

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

        var graphic = new Graphic(geometry, symbol, fields);
        graphic.id = id;
        graphic.type = type;

        this.graphicsLayer.add(graphic);
      }, this);
    },

    onTopicHandler_deleteOverlays: function (params) {
      var types = params.types || [];
      var ids = params.ids || [];
      for (var i = 0; i < this.graphicsLayer.graphics.length; i++) {
        var graphic = this.graphicsLayer.graphics[i];
        //只判断type
        if ((types.length > 0 && ids.length === 0 && array.indexOf(types, graphic.type) >= 0) ||
          (types.length === 0 && ids.length > 0 && array.indexOf(ids, graphic.id) >= 0) ||
          (types.length > 0 && ids.length > 0 && array.indexOf(types, graphic.type) >= 0 && array.indexOf(ids, graphic.id) >= 0)) {
          this.graphicsLayer.remove(graphic);
          i--;
        }
      }
    },

    onTopicHandler_deleteAllOverlays: function () {
      this.graphicsLayer.clear();
    }

  });
  
  return clazz;
  
  
});
