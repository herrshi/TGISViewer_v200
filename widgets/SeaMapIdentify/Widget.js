define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "jimu/BaseWidget",
  "esri/layers/ArcGISTiledMapServiceLayer",
  "esri/tasks/IdentifyTask",
  "esri/tasks/IdentifyParameters"
], function(
  declare,
  lang,
  topic,
  BaseWidget,
  ArcGISTiledMapServiceLayer,
  IdentifyTask,
  IdentifyParameters
) {
  return declare([BaseWidget], {
    _identifyTask: null,
    _identifyParams: null,

    postCreate: function() {
      this.inherited(arguments);

      this._identifyTask = new IdentifyTask(this.config.identify.url);
      this._identifyParams = new IdentifyParameters();
      this._identifyParams.tolerance = 3;
      this._identifyParams.returnGeometry = true;
      this._identifyParams.layerIds = [0];
      this._identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
      this._identifyParams.width = this.map.width;
      this._identifyParams.height = this.map.height;

      this.config.layers.forEach(function(layerConfig) {
        var tiledLayer = new ArcGISTiledMapServiceLayer(layerConfig.tiledUrl);
        tiledLayer.setVisibility(false);
        tiledLayer.id = layerConfig.name;
        this.map.addLayer(tiledLayer);
      }, this);

      topic.subscribe(
        "setLayerVisibility",
        lang.hitch(this, this.onTopicHandler_setLayerVisibility)
      );
    },

    onTopicHandler_setLayerVisibility: function(params) {
      var layer = this.map.getLayer(params.label);
      if (layer !== undefined) {
        layer.setVisibility(params.visible);
      }
    }
  });
});
