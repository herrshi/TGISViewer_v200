define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "dojo/on",
  "jimu/BaseWidget",
  "esri/toolbars/draw",
  "esri/geometry/jsonUtils",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/Color",
  "esri/graphic",
  "esri/geometry/Polygon",
  "esri/layers/GraphicsLayer",
  "esri/geometry/webMercatorUtils"
], function(
  declare,
  lang,
  topic,
  on,
  BaseWidget,
  Draw,
  geometryJsonUtils,
  SimpleMarkerSymbol,
  PictureMarkerSymbol,
  SimpleLineSymbol,
  SimpleFillSymbol,
  Color,
  Graphic,
  Polygon,
  GraphicsLayer,
  WebMercatorUtils
) {
  return declare([BaseWidget], {
    drawToolbar: null,
    drawLayer: null,
    lastDrawGeometry: null,
    drawCallback: null,
    drawStartCallback: null,
    _drawSymbol: null,
    _clearlastDraw: false,
    drawPointSymbol: new SimpleMarkerSymbol(
      SimpleMarkerSymbol.STYLE_CIRCLE,
      10,
      new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([0, 0, 0, 1]),
        1
      ),
      new Color([255, 0, 0, 1])
    ),
    drawLineSymbol: new SimpleLineSymbol(
      SimpleLineSymbol.STYLE_SOLID,
      new Color([0, 0, 0, 1]),
      1
    ),
    drawPolygonSymbol: new SimpleFillSymbol(
      SimpleFillSymbol.STYLE_SOLID,
      new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([0, 0, 0, 1]),
        1
      ),
      new Color([255, 0, 0, 0.5])
    ),

    postCreate: function() {
      this.inherited(arguments);

      this.drawLayer = new GraphicsLayer();
      this.map.addLayer(this.drawLayer);

      this.drawToolbar = new Draw(this.map);
      this.own(
        on(
          this.drawToolbar,
          "draw-complete",
          lang.hitch(this, this.onDrawToolBarHandler_drawComplete)
        )
      );

      topic.subscribe(
        "startDrawOverlay",
        lang.hitch(this, this.onTopicHandler_startDrawOverlay)
      );

      topic.subscribe(
        "stopDrawOverlay",
        lang.hitch(this, this.onTopicHandler_stopDrawOverlay)
      );

      topic.subscribe(
        "clearDrawOverlay",
        lang.hitch(this, this.onTopicHandler_clearDrawOverlay)
      );
    },

    onTopicHandler_startDrawOverlay: function(params) {
      var drawType = params.params.drawType;
      this._drawSymbol = params.params.symbol;

      this.drawCallback = params.callback;

      this.drawStartCallback = params.startcallback;

      this._clearlastDraw = params.params.isClear === true;

      this.drawToolbar.activate(drawType);
      if (this.drawStartCallback) {
        var drawStartEvent = this.map.on(
          "click",
          lang.hitch(this, function(e) {
            if (this.drawStartCallback) {
              this.drawStartCallback();
            }
              drawStartEvent.remove();
          })
        );
      }
    },

    onTopicHandler_clearDrawOverlay: function() {
      this.drawLayer.clear();
    },

    onTopicHandler_stopDrawOverlay: function() {
      this.drawToolbar.deactivate();
    },

    onDrawToolBarHandler_drawComplete: function(event) {
      if (this._clearlastDraw) {
        this.drawLayer.clear();
      }
      var symbol;
      this.lastDrawGeometry = event.geometry;
      switch (this.lastDrawGeometry.type) {
        case "point":
        case "multipoint":
          if (this._drawSymbol) {
            symbol = this._getEsriPointSymbol(this._drawSymbol);
          } else {
            symbol = this.drawPointSymbol;
          }
          break;

        case "polyline":
          if (this._drawSymbol) {
            symbol = this._getESRILineSymbol(this._drawSymbol);
          } else {
            symbol = this.drawLineSymbol;
          }
          break;

        case "extent":
          var a = this.lastDrawGeometry;
          var polygon = new Polygon(a.spatialReference);
          var r = [
            [a.xmin, a.ymin],
            [a.xmin, a.ymax],
            [a.xmax, a.ymax],
            [a.xmax, a.ymin],
            [a.xmin, a.ymin]
          ];
          polygon.addRing(r);
          this.lastDrawGeometry = polygon;
          symbol = this.drawPolygonSymbol;
          break;

        case "polygon":
          if (this._drawSymbol) {
            symbol = this._getESRIPolygonSymbol(this._drawSymbol);
          } else {
            symbol = this.drawPolygonSymbol;
          }
          break;
      }

      var drawGraphic = new Graphic(this.lastDrawGeometry, symbol);
      this.drawLayer.add(drawGraphic);

      if (this.drawCallback) {
        if (this.map.spatialReference.isWebMercator()) {
          this.drawCallback(
            WebMercatorUtils.webMercatorToGeographic(this.lastDrawGeometry)
          );
        }
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
    }
  });
});
