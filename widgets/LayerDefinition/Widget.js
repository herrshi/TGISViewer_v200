define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "dojo/dom",
  "dojo/dom-construct",
  "dojo/dom-style",
  "dojo/dom-attr",
  "dojo/dom-class",
  "dojo/_base/window",
  "jimu/BaseWidget",
  "jimu/utils",
  "esri/graphic",
  "esri/geometry/Extent",
  "esri/layers/FeatureLayer",
  "esri/layers/ArcGISDynamicMapServiceLayer",
  "esri/tasks/IdentifyTask",
  "esri/tasks/IdentifyParameters",
  "esri/tasks/query",
  "esri/tasks/QueryTask"
], function(
  declare,
  lang,
  topic,
  dom,
  domConstruct,
  domStyle,
  domAttr,
  domClass,
  win,
  BaseWidget,
  GeometryUtil,
  Graphic,
  Extent,
  FeatureLayer,
  ArcGISDynamicMapServiceLayer,
  IdentifyTask,
  IdentifyParameters,
  Query,
  QueryTask
) {
  return declare([BaseWidget], {
    postCreate: function() {
      this.inherited(arguments);

      topic.subscribe(
        "LayerDefinition",
        lang.hitch(this, this.onTopicHandler_LayerDefinition)
      );
    },
    onTopicHandler_LayerDefinition: function(params) {
      var layername = params.layer;
      var expressions = params.expressions;
      for (var i = 0; i < this.map.layerIds.length; i++) {
        var layer = this.map.getLayer(this.map.layerIds[i]);
        if (layer.label === layername) {
          var layerDefinitions = [];
          for (var j = 0; j < expressions.length; j++) {
            var exp = expressions[j];
            layerDefinitions[exp.id] = exp.expression;
          }
          layer.setLayerDefinitions(layerDefinitions);
          layer.setVisibility(true);
          this.doIdentifyTask(layer.url, layerDefinitions);
        }
      }
      for (i = 0; i < this.map.graphicsLayerIds.length; i++) {
        layer = this.map.getLayer(this.map.graphicsLayerIds[i]);
        if (layer.label === layername) {
          layer.setDefinitionExpression(expressions);
          layer.setVisibility(true);
          this.doQueryTask(layer.url,expressions);
        }
      }
    },
    doIdentifyTask: function(layerUrl, layerDefinitions) {
      var identifyTask = new IdentifyTask(layerUrl);
      var identifyParam = new IdentifyParameters();
      identifyParam.width = this.map.width;
      identifyParam.height = this.map.height;
      identifyParam.mapExtent = this.map.extent;
      identifyParam.returnGeometry = true;
      identifyParam.returnFieldName = true;
      identifyParam.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
      identifyParam.tolerance = 3;
      identifyParam.layerDefinitions = layerDefinitions;
      identifyParam.geometry = new Extent(-180, -90, 180, 90);
      identifyTask.execute(identifyParam).then(
        lang.hitch(this, function(identifyResults) {
          if (identifyResults.length > 0) {
            var feature = identifyResults[0].feature;
            this.map.setExtent(feature.geometry.getExtent().expand(2));
          }
        }),
        function(error) {
          console.log(error);
        }
      );
    },
    doQueryTask: function(layerUrl, where) {
      var queryTask = new QueryTask(layerUrl);
      var query = new Query();
      query.returnGeometry = true;
      query.where = where;
      query.outFields = ["*"];
      queryTask.execute(
        query,
        lang.hitch(this, function(featureSet) {
          var features = featureSet.features;
          if (features.length == 1) {
            var graphic = features[0];
            this.map.setExtent(graphic.geometry.getExtent().expand(2));
          }
        }),
        function(error) {}
      );
    }
  });
});
