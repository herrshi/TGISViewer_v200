define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/_base/xhr",
  "esri/request",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/geometry/Point",
  "esri/geometry/Geometry",
  "esri/geometry/webMercatorUtils",
  "esri/renderers/HeatmapRenderer",
  "esri/Color",
  "esri/graphic",
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
  SimpleMarkerSymbol,
  Point,
  Geometry,
  WebMercatorUtils,
  HeatmapRenderer,
  Color,
  Graphic,
  BaseWidget
) {
  return declare([BaseWidget], {
    _echartsOver: null,
    heatLayer: null,
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
        id: "heatLayer"
      });

      this.map.addLayer(this.heatLayer);
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
      var points = params.points;
      var options = params.options;
      var features = [];
      for (var i = 0; i < points.length; i++) {
        var point = new Point([points[i].geometry.x, points[i].geometry.y]);
        var attr = points[i].fields;
        var graphic = new Graphic(point, new SimpleMarkerSymbol(), attr);
        features.push(graphic);
      }
      this.heatLayer.applyEdits(features, null, null);
      var heatmapRenderer = new HeatmapRenderer({
        field: options.field,
        blurRadius: options.radius || 20,
        colors: options.colors || undefined,
        maxPixelIntensity: options.maxValue || 100,
        minPixelIntensity: options.minValue || 0
      });

      this.heatLayer.setRenderer(heatmapRenderer);
      this.heatLayer.redraw();
    },
    _onTopicHandler_deleteHeatMap: function() {
      this.heatLayer.clear();
      this.heatLayer.refresh();
    }
  });
});
