define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "dojo/Deferred",
  "dojo/promise/all",
  "jimu/BaseWidget",
  "esri/graphic",
  "esri/layers/GraphicsLayer",
  "esri/renderers/jsonUtils"
], function(
  declare,
  lang,
  topic,
  Deferred,
  all,
  BaseWidget,
  Graphic,
  GraphicsLayer,
  rendererJsonUtils
) {
  return declare([BaseWidget], {
    _rendererLayers: [],

    postCreate: function() {
      this.inherited(arguments);

      topic.subscribe(
        "showDynamicRendererLayer",
        lang.hitch(this, this.onTopicHandler_showDynamicRendererLayer)
      );


    },

    _readGroups: function() {
      var def = new Deferred();

      var defs = this.config.layerGroups.map(function(layerGroup) {
        return this._readGroup(layerGroup);
      }, this);

      all(defs).then(function() {
        def.resolve();
      });

      return def;
    },

    _readGroup: function(layerGroup) {
      var def = new Deferred();

      var groupName = layerGroup.name;
      var renderer = rendererJsonUtils.fromJson(layerGroup.renderer);
      var queryFeaturesDef = layerGroup.layers.map(function(layerConfig) {
        var layerType = layerConfig.type || "mapService";

        if (layerType === "json") {
          return this._queryFeatureFromJson(layerConfig, groupName, renderer);
        }
      }, this);

      all(queryFeaturesDef).then(function() {
        def.resolve();
      });

      return def;
    },

    _queryFeatureFromJson: function(layerConfig, groupName, renderer) {
      var def = new Deferred();

      var source = window.path + layerConfig.source;
      var idField = layerConfig.idField || "FEATUREID";

      fetch(source).then(
        lang.hitch(this, function(response) {
          if (response.ok) {
            response.json().then(
              lang.hitch(this, function(data) {
                //创建图层
                var graphicsLayer = new GraphicsLayer();
                graphicsLayer.setVisibility(false);
                //图层有单独的渲染器就不用图层组的渲染器
                graphicsLayer.renderer = layerConfig.renderer
                  ? rendererJsonUtils.fromJson(layerConfig.renderer)
                  : renderer;
                //存放分组名称
                //使用分组名称控制显示/隐藏
                graphicsLayer.groupName = groupName;
                //加点
                data.features.forEach(function(feature) {
                  var graphic = new Graphic(feature);
                  graphic.id = graphic.attributes[idField];
                  graphicsLayer.add(graphic);
                });
                this.map.addLayer(graphicsLayer, layerConfig.layerIndex);
                this._rendererLayers.push(graphicsLayer);
                def.resolve();
              })
            );
          }
        })
      );

      return def;
    },

    _setLayerData: function(params) {
      this._rendererLayers.forEach(function (rendererLayer) {
        if (rendererLayer.groupName === params.name) {
          if (!rendererLayer.visible) {
            rendererLayer.setVisibility(true);
          }

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
        }
      }, this);
    },

    onTopicHandler_showDynamicRendererLayer: function(params) {
      if (this._rendererLayers.length === 0) {
        this._readGroups().then(
          lang.hitch(this, function() {
            console.log(this._rendererLayers);
            this._setLayerData(params);
          })
        );
      } else {
        this._setLayerData(params);
      }
    }
  });
});
