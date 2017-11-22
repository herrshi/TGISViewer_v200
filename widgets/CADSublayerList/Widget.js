define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "jimu/BaseWidget",
  "jimu/CustomLayers/ChengDiDynamicMapServiceLayer"
], function (
  declare,
  lang,
  topic,
  BaseWidget,
  ChengDiDynamicMapServiceLayer
) {
  return declare([BaseWidget], {
    name: "CADSublayerList",
    baseClass: "jimu-widget-CADSublayerList",

    postCreate: function () {
      topic.subscribe("addLayer", lang.hitch(this, this.onTopicHandler_addLayer));
    },

    /**
     * 不显示子图层选择框, 直接显示服务
     * */
    _showWholeLayer: function (url, label) {
      //如果传入的是cad服务名, 使用配置中的完整服务url替换
      if (url.indexOf("http") < 0) {
        url = this.config.CADServiceUrl.replace(/{name}/i, url);
      }
      var layer = new ChengDiDynamicMapServiceLayer(url);
      layer.label = label;
      this.map.addLayer(layer);
    },
    
    onTopicHandler_addLayer: function (params) {
      var layerType = params.type;
      var layerUrl = params.url;
      var layerLabel = params.label;
      var showSublayers = params.showSubLayers === true;

      if (layerType !== undefined && layerType.toLowerCase() === "ChengDiDynamic".toLowerCase()) {
        if (!showSublayers) {
          this._showWholeLayer(layerUrl, layerLabel);
        }
      }

    }
  });
});