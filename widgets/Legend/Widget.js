define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/html",
  "dojo/_base/array",
  "dijit/_WidgetsInTemplateMixin",
  "jimu/BaseWidget",
  "esri/dijit/Legend"
], function (decalre,
             lang,
             html,
             array,
             _WidgetsInTemplateMixin,
             BaseWidget,
             Legend) {
  var clazz = decalre([BaseWidget, _WidgetsInTemplateMixin], {
    name: "Legend",
    baseClass: "jimu-widget-legend",
    legend: null,

    startup: function () {
      this.inherited(arguments);
    },

    onOpen: function () {
      var legendParams = {
        arrangement: this.config.legend.arrangement,
        autoUpdate: this.config.legend.autoUpdate,
        respectCurrentMapScale: this.config.legend.respectCurrentMapScale,
        //respectVisibility: false,
        map: this.map,
        layerInfos: this._getLayerInfosParam()
      };
      this.legend = new Legend(legendParams, html.create("div", {}, this.domNode));
      this.legend.startup();
    },

    onClose: function () {
      this.legend.destroy();
    },

    _getLayerInfosParam: function () {
      var layerInfosParam = [];

      if (this.config.legend.layerInfos && this.config.legend.layerInfos.length) {
        array.forEach(this.config.legend.layerInfos, function (layerInfoConfig) {
          var layer = this._getLayerByLabel(layerInfoConfig.label);
          layerInfosParam.push({
            layer: layer,
            title: layerInfoConfig.label
          });
        }, this);
      }

      return layerInfosParam;
    },

    _getLayerByLabel: function (label) {
      for (var i = 0; i < this.map.layerIds.length; i++) {
        var layer = this.map.getLayer(this.map.layerIds[i]);
        if (layer.label === label) {
          return layer;
        }
      }

      for (i = 0; i < this.map.graphicsLayerIds.length; i++) {
        layer = this.map.getLayer(this.map.graphicsLayerIds[i]);
        if (layer.label === label) {
          return layer;
        }
      }
    }
  });

  return clazz;
});