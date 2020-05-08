define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/_base/xhr",
  "esri/request",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/geometry/Point",
  "esri/geometry/Geometry",
  "esri/geometry/webMercatorUtils",
  "esri/renderers/HeatmapRenderer",
  "esri/renderers/SimpleRenderer",
  "esri/Color",
  "esri/graphic",
  "esri/dijit/LayerSwipe",
  "esri/renderers/jsonUtils",
  "jimu/BaseWidget"
], function(
  declare,
  lang,
  array,
  topic,
  xhr,
  esriRequest,
  FeatureLayer,
  GraphicsLayer,
  PictureMarkerSymbol,
  SimpleMarkerSymbol,
  SimpleLineSymbol,
  Point,
  Geometry,
  WebMercatorUtils,
  HeatmapRenderer,
  SimpleRenderer,
  Color,
  Graphic,
  LayerSwipe,
  rendererJsonUtils,
  BaseWidget
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
  return declare([BaseWidget], {
    heatLayer: null,
    defaultRenderJson: null,
    eventHandle: null,

    postCreate: function() {
      this.inherited(arguments);

      var featureCollection = {
        layerDefinition: null,
        featureSet: {
          features: [],
          geometryType: "esriGeometryPoint"
        }
      };
      featureCollection.layerDefinition = {
        geometryType: "esriGeometryPoint",
        objectIdField: "ObjectID",
        fields: [
          {
            name: "ObjectID",
            alias: "ObjectID",
            type: "esriFieldTypeOID"
          }
        ]
      };

      this.heatLayer = new FeatureLayer(featureCollection, {
        id: "heatLayer",
        visible: false
      });

      this.map.addLayer(this.heatLayer);

      this.defaultRenderJson = {
        type: "simple",
        symbol: {
          color: [65, 105, 225, 255],
          size: 12,
          type: "esriSMS",
          style: "esriSMSCircle",
          outline: {
            color: [220, 220, 220, 255],
            width: 2,
            type: "esriSLS",
            style: "esriSLSSolid"
          }
        }
      };
      topic.subscribe(
        "addHeatMap",
        lang.hitch(this, this._onTopicHandler_addHeatMap)
      );
      topic.subscribe(
        "deleteHeatMap",
        lang.hitch(this, this._onTopicHandler_deleteHeatMap)
      );
    },
    _onTopicHandler_addHeatMap: function(params) {
      this.heatLayer.clear();
      this.heatLayer.hide();
      if (this.eventHandle) {
        this.eventHandle.remove();
      }
      var points = params.points;
      var options = params.options || {};
      var features = [];

      var renderer;
      if (options.renderer) {
        renderer = options.renderer;
      } else {
        renderer = this.defaultRenderJson;
      }

      for (var i = 0; i < points.length; i++) {
        var point = new Point([points[i].geometry.x, points[i].geometry.y]);
        var attr = points[i].fields;
        var graphic = new Graphic(point, null, attr);
        features.push(graphic);
      }

      this.heatLayer.applyEdits(features, null, null);
      var heatmapRenderer = new HeatmapRenderer({
        field: options.field,
        blurRadius: options.radius || 25,
        colors: options.colors || [
          "rgba(0, 0, 255, 0)",
          "rgb(0, 255, 0)",
          "rgb(255, 255, 0)",
          "rgb(255, 0, 0)"
        ],
        maxPixelIntensity: options.maxValue || 100,
        minPixelIntensity: options.minValue || 0
      });

      var zoom = options.zoom || this.map.getMaxZoom();
      if (this.map.getZoom() <= zoom) {
        this.heatLayer.setRenderer(heatmapRenderer);
      } else {
        this.heatLayer.setRenderer(rendererJsonUtils.fromJson(renderer));
      }

      this.heatLayer.redraw();
      this.heatLayer.show();
      this.eventHandle = this.map.on(
        "zoom-end",
        lang.hitch(this, function(event) {
          if (event.level <= zoom) {
            this.heatLayer.setRenderer(heatmapRenderer);
          } else {
            this.heatLayer.setRenderer(rendererJsonUtils.fromJson(renderer));
          }
          this.heatLayer.redraw();
          this.heatLayer.show();
        })
      );
      // var layer=this.map.getLayer("heatLayer");
      // var swipeWidget = new LayerSwipe(
      //   {
      //     type: "horizontal", //Try switching to "scope" or "horizontal"
      //     map: this.map,
      //     layers: [layer]
      //   },
      //   "swipeDiv"
      // );
      // swipeWidget.startup();
    },
    _onTopicHandler_deleteHeatMap: function() {
      this.heatLayer.clear();
      this.heatLayer.refresh();
      if (this.eventHandle) {
        this.eventHandle.remove();
      }
    }
  });
});
