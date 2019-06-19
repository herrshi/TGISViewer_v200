define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "dojo/Deferred",
  "dojo/promise/all",
  "jimu/BaseWidget",
  "jimu/utils",
  "esri/Color",
  "esri/graphic",
  "esri/InfoTemplate",
  "esri/layers/GraphicsLayer",
  "esri/layers/FeatureLayer",
  "esri/layers/LabelClass",
  "esri/renderers/jsonUtils",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/TextSymbol",
  "esri/renderers/SimpleRenderer",
  "esri/tasks/query",
  "esri/tasks/QueryTask"
], function(
  declare,
  lang,
  topic,
  Deferred,
  all,
  BaseWidget,
  jimuUtils,
  Color,
  Graphic,
  InfoTemplate,
  GraphicsLayer,
  FeatureLayer,
  LabelClass,
  rendererJsonUtils,
  SimpleLineSymbol,
  TextSymbol,
  SimpleRenderer,
  Query,
  QueryTask
) {
  return declare([BaseWidget], {
    _rendererLayers: [],
    _infoTemplates: {},

    postCreate: function() {
      this.inherited(arguments);
      topic.subscribe(
        "showDynamicRendererLayer",
        lang.hitch(this, this._onTopicHandler_showDynamicRendererLayer)
      );
      topic.subscribe(
        "findFeature",
        lang.hitch(this, this._onTopicHandler_findFeature)
      );
    },

    _readConfigs: function() {
      var def = new Deferred();
      var readConfigDefs = this.config.dynamicRenderers.map(function(
        dynamicRendererConfig
      ) {
        return this._readConfig(dynamicRendererConfig);
      },
      this);

      all(readConfigDefs).then(function() {
        def.resolve();
      });

      return def;
    },

    _readConfig: function(dynamicRendererConfig) {
      var def = new Deferred();

      var rendererLayer = new GraphicsLayer();
      rendererLayer.setVisibility(false);
      this.map.addLayer(rendererLayer);
      rendererLayer.id = dynamicRendererConfig.name;
      rendererLayer.label = dynamicRendererConfig.label;
      rendererLayer.renderer = rendererJsonUtils.fromJson(
        dynamicRendererConfig.renderer
      );
      this._rendererLayers.push(rendererLayer);

      var infoTemplate;
      if (dynamicRendererConfig.infoTemplate !== undefined) {
        infoTemplate = new InfoTemplate(dynamicRendererConfig.infoTemplate);
        rendererLayer.on(
          "mouse-over",
          lang.hitch(this, this._onRendererLayerHandler_mouseOver)
        );
        rendererLayer.on(
          "mouse-out",
          lang.hitch(this, function() {
            this.map.infoWindow.hide();
          })
        );
      }

      var layers = dynamicRendererConfig.layers;
      var queryFeatureDefs = layers.map(function(layerConfig) {
        var layerType = layerConfig.type || "mapService";
        var idField = layerConfig.idField || "FEATUREID";
        switch (layerType) {
          case "json":
            var source = window.path + layerConfig.source;
            return this._queryFeaturesFromJson(source, idField, infoTemplate);

          case "mapService":
            var url = layerConfig.url;
            url = url.replace(/{gisServer}/i, this.appConfig.gisServer);

            return this._queryFeaturesFromService(url, idField, infoTemplate);
        }
      }, this);

      all(queryFeatureDefs).then(function(defResults) {
        defResults.forEach(function(defResult) {
          defResult.forEach(function(feature) {
            rendererLayer.add(feature);
          });
        });

        def.resolve();
      });

      return def;
    },

    _queryFeaturesFromService: function(url, idField, infoTemplate) {
      var def = new Deferred();

      var query = new Query();
      query.where = "1=1";
      query.returnGeometry = true;
      query.outFields = ["*"];

      var queryTask = new QueryTask(url);
      queryTask.execute(query).then(
        function(queryResults) {
          var features = queryResults.features;
          features.forEach(function(feature) {
            feature.id = feature.attributes[idField];
            if (infoTemplate !== undefined) {
              feature.setInfoTemplate(infoTemplate);
            }
          });
          def.resolve(features);
        },
        function(error) {
          def.reject(error);
        }
      );

      return def;
    },

    _queryFeaturesFromJson: function(source, idField, infoTemplate) {
      var def = new Deferred();

      fetch(source).then(
        lang.hitch(this, function(response) {
          if (response.ok) {
            response.json().then(
              lang.hitch(this, function(data) {
                var features = data.features.map(function (feature) {
                  var graphic = new Graphic(feature);
                  graphic.id = graphic.attributes[idField];
                  if (infoTemplate !== undefined) {
                    graphic.setInfoTemplate(infoTemplate);
                  }
                  return graphic;
                });
                console.log(features);
                def.resolve(features);
              })
            );
          }
        })
      );
      return def;
    },

    _setLayerData: function(params) {
      for (var i = 0; i < this._rendererLayers.length; i++) {
        var rendererLayer = this._rendererLayers[i];

        if (rendererLayer.id === params.name) {
          rendererLayer.setVisibility(true);
          if (params.datas !== undefined || params.defaultData !== undefined) {
            rendererLayer.graphics.forEach(function(graphic) {
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

          rendererLayer.refresh();
        } else {
          rendererLayer.setVisibility(false);
        }
      }
    },

    _onTopicHandler_showDynamicRendererLayer: function(params) {
      if (this._rendererLayers.length === 0) {
        this._readConfigs().then(
          lang.hitch(this, function() {
            this._setLayerData(params);
          })
        );
      } else {
        this._setLayerData(params);
      }
    },

    _onRendererLayerHandler_mouseOver: function(event) {
      var graphic = event.graphic;
      this.map.infoWindow.setContent(graphic.getContent());
      this.map.infoWindow.setTitle(graphic.getTitle());
      this.map.infoWindow.show(
        event.mapPoint,
        this.map.getInfoWindowAnchor(event.screenPoint)
      );
    },

    _onTopicHandler_findFeature: function(params) {
      var layerName = params.params.layerName || "";
      var ids = params.params.ids || "";

      for (var i = 0; i < this._rendererLayers.length; i++) {
        var rendererLayer = this._rendererLayers[i];
        if (rendererLayer.id === layerName) {
          ids.forEach(function(id) {
            for (var j = 0; j < rendererLayer.graphics.length; j++) {
              var graphic = rendererLayer.graphics[j];
              if (graphic.id === id) {
                //先用一个graphic定位, 后面再考虑多个geometry作union
                var extent = jimuUtils.getGeometryExtent(graphic.geometry);
                extent.setSpatialReference(this.map.spatialReference);
                this.map.setExtent(extent).then(
                  lang.hitch(this, function() {
                    //显示弹出框
                    var centerPoint = jimuUtils.getGeometryCenter(
                      graphic.geometry
                    );
                    this.map.infoWindow.setContent(graphic.getContent());
                    this.map.infoWindow.setTitle(graphic.getTitle());
                    this.map.infoWindow.show(
                      centerPoint,
                      this.map.getInfoWindowAnchor(
                        this.map.toScreen(centerPoint)
                      )
                    );

                    //高亮
                    var node = graphic.getNode();
                    node.setAttribute("data-highlight", "highlight");
                    setTimeout(function() {
                      node.setAttribute("data-highlight", "");
                    }, 5000);
                  })
                );

                break;
              }
            }
          }, this);
          break;
        }
      }
    }
  });
});
