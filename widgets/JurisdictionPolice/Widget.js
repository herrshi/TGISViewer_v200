/**
 * 辖区警力
 * 通过json文件画出辖区，再在辖区中标注警力
 * */

define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "jimu/BaseWidget",
  "esri/layers/FeatureLayer",
  "esri/renderers/SimpleRenderer"
], function(declare, lang, topic, BaseWidget, FeatureLayer, SimpleRenderer) {
  return declare([BaseWidget], {
    postCreate: function() {
      this.inherited(arguments);
      this._readLayer();
    },

    _readLayer: function() {
      fetch(window.path + "configs/JurisdictionPolice/Jurisdiction.json").then(
        lang.hitch(this, function(response) {
          if (response.ok) {
            response.json().then(
              lang.hitch(this, function(data) {
                console.log(data);
                var featureCollection = {
                  layerDefinition: data,
                  featureSet: data
                };

                var layer = new FeatureLayer(featureCollection);
                var renderer = new SimpleRenderer({
                  type: "simple",
                  symbol: {
                    type: "esriSFS",
                    color: [255, 0, 128, 255],
                    outline: {
                      color: [0, 0, 128, 255],
                      width: 0,
                      type: "esriSLS",
                      style: "esriSLSSolid"
                    }
                  }
                });
                layer.setRenderer(renderer);
                console.log(layer.toJson());
                this.map.addLayer(layer);
              })
            );
          }
        })
      );
    }
  });
});
