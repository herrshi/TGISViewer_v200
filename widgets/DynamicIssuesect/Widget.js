define(["dojo/_base/declare", "dojo/_base/lang", "dojo/topic", "dojo/Deferred", "dojo/promise/all", "jimu/BaseWidget", "esri/graphic", "esri/InfoTemplate", "esri/layers/GraphicsLayer", "esri/renderers/jsonUtils"], function (declare, lang, topic, Deferred, all, BaseWidget, Graphic, InfoTemplate, GraphicsLayer, rendererJsonUtils) {
  return declare([BaseWidget], {
    _rendererLayers: [],

    postCreate: function postCreate() {
      this.inherited(arguments);

      topic.subscribe("showDynamicRendererLayer", lang.hitch(this, this.onTopicHandler_showDynamicRendererLayer));

      topic.subscribe("hideDynamicRendererLayer", lang.hitch(this, this.onTopicHandler_hideDynamicRendererLayer));

      this._readLayerConfig();
    },

    _readLayerConfig: function _readLayerConfig() {
      var _this = this;

      //使用并发fetch, 按顺序获取返回, 已保证图层按照配置的顺序加载
      var fetchs = [];
      var _config = this.config,
          layers = _config.layers,
          renderer = _config.renderer;

      var defaultRenderer = rendererJsonUtils.fromJson(renderer);
      layers.forEach(function (layerConfig) {
        fetchs.push(fetch(window.path + layerConfig.source).then(function (response) {
          return response.json();
        }));
      });

      fetchs.reduce(function (chain, jsonPromise, index) {
        return chain.then(function () {
          return jsonPromise;
        }).then(function (json) {
          return _this._createLayer(json.features, layers[index], defaultRenderer);
        });
      }, Promise.resolve());
      // this.map.addLayers(this._rendererLayers);
    },

    _createLayer: function _createLayer(features, layerConfig, defaultRenderer) {
      var _this2 = this;

      var id = layerConfig.id,
          groupName = layerConfig.group,
          layerRenderer = layerConfig.renderer,
          idField = layerConfig.idField,
          minScale = layerConfig.minScale,
          maxScale = layerConfig.maxScale,
          infoTemplate = layerConfig.infoTemplate;


      var graphicsLayer = new GraphicsLayer();
      graphicsLayer.id = id;
      graphicsLayer.setMinScale(minScale);
      graphicsLayer.setMaxScale(maxScale);
      //使用分组名称控制显示、隐藏
      graphicsLayer.groupName = groupName;
      graphicsLayer.setVisibility(false);
      //使用图层渲染器或者默认渲染器
      graphicsLayer.setRenderer(layerRenderer ? rendererJsonUtils.fromJson(layerRenderer) : defaultRenderer);

      var info = void 0;
      if (infoTemplate) {
        info = new InfoTemplate(infoTemplate);

        graphicsLayer.on("mouse-over", function (event) {
          var graphic = event.graphic;
          _this2.map.infoWindow.setContent(graphic.getContent());
          _this2.map.infoWindow.setTitle(graphic.getTitle());
          _this2.map.infoWindow.show(event.mapPoint, _this2.map.getInfoWindowAnchor(event.screenPoint));
        });
        graphicsLayer.on("mouse-out", function () {
          _this2.map.infoWindow.hide();
        });
      }

      features.forEach(function (feature) {
        var graphic = new Graphic(feature);
        if (idField) {
          graphic.id = graphic.attributes[idField];
        }
        if (info) {
          graphic.setInfoTemplate(info);
        }
        // graphic.attributes.data = "";
        graphicsLayer.add(graphic);
      });
      this.map.addLayer(graphicsLayer);
      this.map.reorderLayer(graphicsLayer, 0);
      this._rendererLayers.push(graphicsLayer);
    },

    _setLayerData: function _setLayerData(params) {
      var groupName = params.name,
          datas = params.datas,
          defaultData = params.defaultData;

      this._rendererLayers.forEach(function (rendererLayer) {
        if (rendererLayer.groupName === groupName) {
          rendererLayer.setVisibility(true);

          if (datas !== undefined || defaultData !== undefined) {
            rendererLayer.graphics.forEach(function (graphic) {
              var found = false;

              if (datas !== undefined) {
                for (var j = 0; j < datas.length; j++) {
                  if (graphic.id === datas[j].id) {
                    graphic.attributes.data = datas[j].data;
                    found = true;
                    break;
                  }
                }
              }

              if (!found && defaultData !== undefined) {
                graphic.attributes.data = defaultData;
              }
            });
          }

          rendererLayer.refresh();
        }
      });
    },

    onTopicHandler_showDynamicRendererLayer: function onTopicHandler_showDynamicRendererLayer(params) {
      var _this3 = this;

      //将遮罩图层至于最上层
      this.map.graphicsLayerIds.forEach(function (layerId) {
        var layer = _this3.map.getLayer(layerId);
        if (layer.id.indexOf("Mask") >= 0) {
          _this3.map.reorderLayer(layer, 100);
        }
      });

      this._setLayerData(params);
    },

    onTopicHandler_hideDynamicRendererLayer: function onTopicHandler_hideDynamicRendererLayer(params) {
      this._rendererLayers.forEach(function (layer) {
        if (!params || params.name === layer.groupName) {
          layer.setVisibility(false);
        }
      });
    }
  });
});
