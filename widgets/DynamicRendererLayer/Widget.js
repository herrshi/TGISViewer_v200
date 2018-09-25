define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/Deferred",
  "dojo/promise/all",
  "jimu/BaseWidget",
  "jimu/utils",
  "esri/Color",
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
  array,
  topic,
  Deferred,
  all,
  BaseWidget,
  jimuUtils,
  Color,
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

      this.test();
    },

    _readConfigs: function() {
      var def = new Deferred();
      var readConfigDefs = [];

      array.forEach(
        this.config.dynamicRenderers,
        function(dynamicRendererConfig) {
          readConfigDefs.push(this._readConfig(dynamicRendererConfig));
        },
        this
      );

      all(readConfigDefs).then(function() {
        def.resolve();
      });

      return def;
    },

    test: function() {
      var statesColor = new Color("#666");
      var statesLine = new SimpleLineSymbol("solid", statesColor, 1.5);
      var statesRenderer = new SimpleRenderer(statesLine);
      var statesUrl = "http://128.64.151.220:6080/arcgis/rest/services/ChangZhi/ChangZhi_fbd/MapServer/5";
      var states = new FeatureLayer(statesUrl, {
        id: "states",
        outFields: ["*"]
      });
      states.id = "IssuesectState";
      states.idFields = "BM_CODE";
      states.setRenderer(statesRenderer);

      // create a text symbol to define the style of labels
      var statesLabel = new TextSymbol().setColor(statesColor);
      statesLabel.font.setSize("14pt");
      statesLabel.font.setFamily("arial");

      //this is the very least of what should be set within the JSON
      var json = {
        "labelExpressionInfo": {"value": "{PATHNAME}"}
      };

      //create instance of LabelClass (note: multiple LabelClasses can be passed in as an array)
      var labelClass = new LabelClass(json);
      labelClass.symbol = statesLabel; // symbol also can be set in LabelClass' json
      states.setLabelingInfo([ labelClass ]);
      this.map.addLayer(states);
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

      var queryFeatureDefs = [];
      var layers = dynamicRendererConfig.layers;
      array.forEach(
        layers,
        function(layerConfig) {
          var url = layerConfig.url;
          url = url.replace(/{gisServer}/i, this.appConfig.gisServer);
          var idField = layerConfig.idField || "FEATUREID";

          queryFeatureDefs.push(
            this._queryFeatures(url, idField, infoTemplate)
          );
        },
        this
      );

      all(queryFeatureDefs).then(function(defResults) {
        array.forEach(defResults, function(defResult) {
          array.forEach(defResult, function(feature) {
            rendererLayer.add(feature);
          });
        });

        def.resolve();
      });

      return def;
    },

    _queryFeatures: function(url, idField, infoTemplate) {
      var def = new Deferred();

      var query = new Query();
      query.where = "1=1";
      query.returnGeometry = true;
      query.outFields = ["*"];

      var queryTask = new QueryTask(url);
      queryTask.execute(query).then(
        function(queryResults) {
          var features = queryResults.features;
          array.forEach(features, function(feature) {
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

    _setLayerData: function(params) {
      for (var i = 0; i < this._rendererLayers.length; i++) {
        var rendererLayer = this._rendererLayers[i];

        if (rendererLayer.id === params.name) {
          rendererLayer.setVisibility(true);
          if (params.datas !== undefined || params.defaultData !== undefined) {
            array.forEach(rendererLayer.graphics, function(graphic) {
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
          array.forEach(
            ids,
            function(id) {
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
            },
            this
          );
          break;
        }
      }
    }
  });
});
