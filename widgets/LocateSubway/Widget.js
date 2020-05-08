/**
 * Created by lvliang on 2019/9/5.
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
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/geometry/Point",
  "esri/geometry/Polyline",
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
  "esri/InfoTemplate",
  "esri/renderers/ClassBreaksRenderer",
  "jimu/CustomLayers/ClusterLayer",
  "dojo/domReady!"
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
  FeatureLayer,
  GraphicsLayer,
  Point,
  Polyline,
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
  InfoTemplate,
  ClassBreaksRenderer,
  ClusterLayer
) {
  return declare([BaseWidget], {
    name: "locatesubway",
    highlightLayers: [],
    hideLabelLayers: [],
    SubWayLayerName: ["地铁标注线", "地铁站点", "机场", "火车站"],
    SubWayPaths: [],
    postCreate: function() {
      this.inherited(arguments);

      topic.subscribe(
        "LocateSubway",
        lang.hitch(this, this.onTopicHandler_LocateSubway)
      );
    },

    onTopicHandler_LocateSubway: function(params) {
      var sub_name = params;
      this._reset();

      for (i = 0; i < this.map.graphicsLayerIds.length; i++) {
        var layer = this.map.getLayer(this.map.graphicsLayerIds[i]);

        if (
          this.SubWayLayerName.indexOf(layer.label) > -1 &&
          layer instanceof FeatureLayer
        ) {
          if (sub_name) {
            this._findInGraphicsLayer(layer, sub_name);
            if (layer.label === "地铁标注线") {
              layer.setOpacity(0.3);
            } else {
              layer.setOpacity(0);
            }
          } else {
            layer.setOpacity(1);
            this._reset();
          }
        }
      }
      if (this.SubWayPaths.length > 0) {
        var polyline = new Polyline([this.SubWayPaths]);
        this.map.setExtent(polyline.getExtent().expand(1.5));
        console.log(this.SubWayPaths.length);
      }
    },
    _findInGraphicsLayer: function(layer, sub_name) {
      var highlightLayer = this._createFeatureLayer(layer); //esriGeometryPoint,esriGeometryPolyline
      var features = [];
      highlightLayer.setRenderer(layer.renderer);
      if (layer.labelingInfo) {
        var labelingInfo = [];
        layer.labelingInfo.forEach(function(label) {
          var newLabel = {};
          newLabel.symbol = label.symbol;
          newLabel.labelExpression = label.labelExpression;
          newLabel.labelPlacement = label.labelPlacement;
          newLabel.useCodedValues = true;
          newLabel.minScale = 0;
          newLabel.maxScale = 0;
          labelingInfo.push(newLabel);
        });
        highlightLayer.setLabelingInfo(labelingInfo);
        layer.showLabels = false;
        this.hideLabelLayers.push(layer);
      }

      this.map.addLayer(highlightLayer);
      this.highlightLayers.push(highlightLayer);

      layer.graphics.forEach(function(graphic) {
        if (
          graphic.attributes["NAME_CHN"] == sub_name ||
          graphic.attributes["Name_chn"] == sub_name ||
          graphic.attributes["SDE.地铁标注点.SUBWAYNAME"] == sub_name ||
          graphic.attributes["SubwayName"] == sub_name
        ) {
          var gra = new Graphic(graphic.geometry, null, graphic.attributes);
          features.push(gra);
          if (graphic.getLayer().label == "地铁站点") {
            var geo = graphic.geometry.spatialReference.isWebMercator()
              ? WebMercatorUtils.webMercatorToGeographic(graphic.geometry)
              : graphic.geometry;
            this.SubWayPaths.push(geo.points[0]);
          }
        }
      }, this);
      highlightLayer.applyEdits(features, null, null);
      // var point = new Point(121.46, 31.23);
      // var grap = new Graphic(
      //   point,
      //   new SimpleMarkerSymbol(
      //     SimpleMarkerSymbol.STYLE_CIRCLE,
      //     300,
      //     new SimpleLineSymbol(
      //       SimpleLineSymbol.STYLE_SOLID,
      //       new Color([255, 0, 0]),
      //       3
      //     ),
      //     new Color([0, 255, 0, 0.25])
      //   )
      // );
      // this.map.graphics.add(grap);
    },
    _createFeatureLayer: function(layer) {
      var featureCollection = {
        layerDefinition: {
          geometryType: layer.geometryType,
          objectIdField: "ObjectID",
          fields: layer.fields
        },
        featureSet: {
          features: [],
          geometryType: layer.geometryType
        }
      };

      var layer = new FeatureLayer(featureCollection, {
        visible: true,
        showLabels: true
      });
      return layer;
    },
    _reset: function() {
      this.highlightLayers.forEach(function(featurelayer) {
        this.map.removeLayer(featurelayer);
      }, this);
      this.hideLabelLayers.forEach(function(featurelayer) {
        featurelayer.showLabels = true;
      }, this);

      this.highlightLayers = [];
      this.hideLabelLayers = [];
      this.SubWayPaths = [];
    }
  });
});
