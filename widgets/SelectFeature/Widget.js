define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "jimu/BaseWidget",
  "esri/layers/FeatureLayer",
  "esri/renderers/jsonUtils",
  "esri/renderers/SimpleRenderer",
  "esri/renderers/UniqueValueRenderer"
], function(
  declare,
  lang,
  topic,
  BaseWidget,
  FeatureLayer,
  rendererJsonUtils,
  SimpleRenderer,
  UniqueValueRenderer
) {
  return declare([BaseWidget], {
    layers: [],

    postCreate: function() {
      this.inherited(arguments);

      this.loadConfig();
      topic.subscribe("selectFeature", lang.hitch(this, this.onTopicHandler_selectFeature));
      topic.subscribe("showSelectedFeatures", lang.hitch(this, this.onTopicHandler_showSelectedFeatures));
    },

    loadConfig: function() {
      this.config.forEach(function(layerConfig) {
        var layerUrl = layerConfig.url.replace(/{gisServer}/i, this.appConfig.gisServer);
        // layerUrl = layerUrl.replace("/{gisServer}/i", this.appConfig.gisServer);
        var layer = new FeatureLayer(layerUrl, {
          id: layerConfig.type,
          mode: FeatureLayer.MODE_SNAPSHOT,
          outFields: ["*"]
        });

        var rendererJson = layerConfig.renderer;
        if (rendererJson) {
          var renderer = rendererJsonUtils.fromJson(rendererJson);
          if (renderer instanceof SimpleRenderer) {
            if (renderer.symbol.type === "picturemarkersymbol") {
              renderer.symbol.url = window.path + "/" + renderer.symbol.url;
            }
          } else if (renderer instanceof UniqueValueRenderer) {
            if (renderer.defaultSymbol.type === "picturemarkersymbol") {
              renderer.defaultSymbol.url =
                window.path + "/" + renderer.defaultSymbol.url;
            }

            renderer.infos.forEach(function(infoObj) {
              if (infoObj.symbol.type === "picturemarkersymbol") {
                infoObj.symbol.url = window.path + "/" + infoObj.symbol.url;
              }
            });
          }

          layer.setRenderer(renderer);
        }
        this.map.addLayer(layer);
        this.layers.push(layer);
      }, this);
    },
    
    onLayerClick: function (event) {
      var graphic = event.graphic;
      if (graphic.attributes.Select !== "select") {
        graphic.attributes.Select = "select";
        //通知页面
        var id = this.getId(graphic);
        if (typeof getScatsPoints !== "undefined" &&
          getScatsPoints instanceof Function) {
          getScatsPoints(id);

        }

      }

      graphic._layer.redraw();

      event.stopPropagation();
    },

    getId: function (graphic) {
      var featureAttributes = graphic.attributes;
      for (var fieldName in featureAttributes) {
        if (featureAttributes.hasOwnProperty(fieldName)) {
          if (
            fieldName.indexOf("DEVICEID") > -1 ||
            fieldName.indexOf("BM_CODE") > -1 ||
            fieldName.indexOf("FEATUREID") > -1
          ) {
            return featureAttributes[fieldName];
          }
        }
      }
    },

    getLayer: function(type) {
      for (var i = 0; i < this.layers.length; i++) {
        var layer = this.layers[i];
        if (layer.id === type) {
          return layer;
        }
      }
    },

    onTopicHandler_selectFeature: function(type) {
      var layer = this.getLayer(type);
      if (layer) {
        layer.on("click", lang.hitch(this, this.onLayerClick));
        layer.setVisibility(true);
      }
    },

    onTopicHandler_showSelectedFeatures: function (params) {
      var layer = this.getLayer(params.type);
      if (layer) {
        layer.setVisibility(true);

        layer.graphics.forEach(function (graphic) {
          var id = this.getId(graphic);
          var found = false;
          for (var i = 0; i < params.features.length; i++) {
            var feature = params.features[i];
            if (feature.id === id) {
              graphic.attributes.Select = feature.locked ? "lock" : "select";
              graphic.visible = true;
              found = true;
              break;
            }
          }
          if (!found) {
            graphic.visible = false;
          }
        }, this);

        layer.redraw();
      }

    }
  });
});
