define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "dojo/request/xhr",
  "dojo/Deferred",
  "jimu/BaseWidget",
  "jimu/CustomLayers/ChengDiDynamicMapServiceLayer"
], function (
  declare,
  lang,
  topic,
  xhr,
  Deferred,
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
      var layer = new ChengDiDynamicMapServiceLayer(url);
      layer.label = label;
      this.map.addLayer(layer);
    },
    
    _getSublayerInfo: function (url) {
      var def = new Deferred();

      xhr(url + "?f=json", {
        handleAs: "json"
      }).then(function (data) {
        def.resolve(data.layers);
      }, function (error) {
        def.reject(error);
      });

      return def;
    },
    
    onTopicHandler_addLayer: function (params) {
      var layerType = params.type;
      var layerUrl = params.url;
      var layerLabel = params.label;
      var showSublayers = params.showSublayers === true;
      
      //如果传入的是cad服务名, 使用配置中的完整服务url替换
      if (layerUrl.indexOf("http") < 0) {
        layerUrl = this.config.CADServiceUrl.replace(/{name}/i, layerUrl);
      }

      if (layerType !== undefined && layerType.toLowerCase() === "ChengDiDynamic".toLowerCase()) {
        if (!showSublayers) {
          this._showWholeLayer(layerUrl, layerLabel);
        }
        else {
          this._getSublayerInfo(layerUrl).then(function (sublayerInfos) {
            console.log(sublayerInfos);
          });
        }
      }

    }
  });
});