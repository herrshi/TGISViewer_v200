define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "dojo/on",
  "jimu/BaseWidget",
  "esri/toolbars/draw",
  "esri/symbols/SimpleMarkerSymbol",
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
  SimpleMarkerSymbol,
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
    },

    onTopicHandler_startDrawOverlay: function(params) {
      var drawType = params.params.drawType;
      this.drawCallback = params.callback;

      this.drawToolbar.activate(drawType);
    },

    onDrawToolBarHandler_drawComplete: function(event) {
      var symbol;
      this.lastDrawGeometry = event.geometry;
      switch (this.lastDrawGeometry.type) {
        case "point":
        case "multipoint":
          symbol = this.drawPointSymbol;
          break;

        case "polyline":
          symbol = this.drawLineSymbol;
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
          symbol = this.drawPolygonSymbol;
          break;
      }

      var drawGraphic = new Graphic(this.lastDrawGeometry, symbol);
      this.drawLayer.add(drawGraphic);

      if (this.drawCallback) {
        if (this.map.spatialReference.isWebMercator()) {
          this.drawCallback(WebMercatorUtils.webMercatorToGeographic(this.lastDrawGeometry));
        }

      }
    }
  });
});
