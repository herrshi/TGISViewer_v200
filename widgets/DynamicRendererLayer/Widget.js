define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/Deferred",
  "dojo/promise/all",
  "jimu/BaseWidget",
  "esri/layers/GraphicsLayer",
  "esri/renderers/jsonUtils",
  "esri/tasks/query",
  "esri/tasks/QueryTask"
], function (
  declare,
  lang,
  array,
  topic,
  Deferred,
  all,
  BaseWidget,
  GraphicsLayer,
  rendererJsonUtils,
  Query,
  QueryTask
) {
  return declare([BaseWidget], {
    rendererLayers: [],

    postCreate: function () {
      // this._readConfigs();
      topic.subscribe("showDynamicRendererLayer", lang.hitch(this, this.onTopicHandler_showDynamicRendererLayer));
    },

    _readConfigs: function () {
      var def = new Deferred();

      array.forEach(this.config.dynamicRenderers, function (dynamicRenderer) {
        var rendererLayer = new GraphicsLayer();
        rendererLayer.setVisibility(false);
        this.map.addLayer(rendererLayer);
        rendererLayer.id = dynamicRenderer.name;
        rendererLayer.renderer = rendererJsonUtils.fromJson(dynamicRenderer.renderer);
        this.rendererLayers.push(rendererLayer);

        var defs = [];
        var layers = dynamicRenderer.layers;
        array.forEach(layers, function (layerConfig) {
          var url = layerConfig.url;
          url = url.replace(/{gisServer}/i, this.appConfig.gisServer);
          var idField = layerConfig.idField || "FEATUREID";

          defs.push(this._queryFeatures(url, idField));
        }, this);

        all(defs).then(lang.hitch(this, function (defResults) {
          array.forEach(defResults, function (defResult) {
            array.forEach(defResult, function (feature) {
              rendererLayer.add(feature);
            });
          });

          def.resolve();
        }));
      }, this);

      return def;
    },
    
    _queryFeatures: function (url, idField) {
      var def = new Deferred();

      var query = new Query();
      query.where = "1=1";
      query.returnGeometry = true;
      query.outFields = ["*"];

      var queryTask = new QueryTask(url);
      queryTask.execute(query).then(function (queryResults) {
        var features = queryResults.features;
        array.forEach(features, function (feature) {
          feature.id = feature.attributes[idField];
        });
        def.resolve(features);
      }, function (error) {
        def.reject(error);
      });

      return def;
    },

    _setLayerData: function (params) {
      for (var i = 0; i < this.rendererLayers.length; i++) {
        var rendererLayer = this.rendererLayers[i];

        if (rendererLayer.id === params.name) {
          if (params.datas !== undefined || params.defaultData !== undefined) {
            array.forEach(rendererLayer.graphics, function (graphic) {
              var found = false;

              if (params.datas !== undefined) {
                for (var j = 0; j < params.datas.length; j++) {
                  if (graphic.id === params.datas[j].id) {
                    graphic.attributes.data = params.datas[j].data;

                    params.datas.splice(j, 1);
                    found = true;
                    break;
                  }
                }
              }

              if (!found && params.defaultData !== undefined) {
                graphic.attributes.data = params.defaultData;
              }
            });
          }

          rendererLayer.setVisibility(true);
          rendererLayer.refresh();
          break;
        }
      }
    },

    onTopicHandler_showDynamicRendererLayer: function (params) {
      if (this.rendererLayers.length === 0) {
        this._readConfigs().then(lang.hitch(this, function () {
          this._setLayerData(params);
        }));
      }
      else {
        this._setLayerData(params);
      }


    }
  });

});