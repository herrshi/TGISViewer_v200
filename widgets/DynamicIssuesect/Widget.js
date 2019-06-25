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

      topic.subscribe("hideDynamicRendererLayer",
        lang.hitch(this, this.onTopicHandler_hideDynamicRendererLayer));

      this.map.on("zoom-end", () => {
        const scale = this.map.getScale();
        console.log(this.map.getScale());
        this._rendererLayers.forEach(layer => {
          if (layer.isVisibleAtScale(scale)) {
            console.log(layer.id);
          }
        });
      });

      this._readLayerConfig();
    },

    _readLayerConfig: function() {
      //使用并发fetch, 按顺序获取返回, 已保证图层按照配置的顺序加载
      const fetchs = [];
      const { layers, renderer } = this.config;
      const defaultRenderer = rendererJsonUtils.fromJson(renderer);
      layers.forEach(layerConfig => {
        fetchs.push(
          fetch(window.path + layerConfig.source).then(response =>
            response.json()
          )
        );
      });

      fetchs.reduce((chain, jsonPromise, index) => {
        return chain
          .then(() => jsonPromise)
          .then(json =>
            this._createLayer(json.features, layers[index], defaultRenderer)
          );
      }, Promise.resolve());
      // this.map.addLayers(this._rendererLayers);
    },

    _createLayer: function(features, layerConfig, defaultRenderer) {
      const {
        id,
        group: groupName,
        renderer: layerRenderer,
        idField,
        minScale,
        maxScale
      } = layerConfig;

      const graphicsLayer = new GraphicsLayer();
      graphicsLayer.id = id;
      graphicsLayer.setMinScale(minScale);
      graphicsLayer.setMaxScale(maxScale);
      //使用分组名称控制显示、隐藏
      graphicsLayer.groupName = groupName;
      graphicsLayer.setVisibility(false);
      //使用图层渲染器或者默认渲染器
      graphicsLayer.setRenderer(
        layerRenderer
          ? rendererJsonUtils.fromJson(layerRenderer)
          : defaultRenderer
      );

      features.forEach(feature => {
        const graphic = new Graphic(feature);
        if (idField) {
          graphic.id = graphic.attributes[idField];
        }
        graphic.attributes.data = "free";
        graphicsLayer.add(graphic);
      });
      this.map.addLayer(graphicsLayer);
      this._rendererLayers.push(graphicsLayer);
    },

    _setLayerData: function(params) {
      const { name: groupName, datas, defaultData } = params;
      this._rendererLayers.forEach(rendererLayer => {
        if (rendererLayer.groupName === groupName) {
          rendererLayer.setVisibility(true);

          if (datas !== undefined || defaultData !== undefined) {
            rendererLayer.graphics.forEach(graphic => {
              let found = false;

              if (datas !== undefined) {
                for (let j = 0; j < datas.length; j++) {
                  if (graphic.id === datas[j].id) {
                    graphic.attr("data", datas[j].data);

                    datas.splice(j, 1);
                    found = true;
                    break;
                  }
                }
              }

              if (!found && defaultData !== undefined) {
                graphic.attr("data", defaultData);
              }
            });
          }

          rendererLayer.refresh();
        }
      });
    },

    onTopicHandler_showDynamicRendererLayer: function(params) {
      //将遮罩图层至于最上层
      this.map.graphicsLayerIds.forEach(layerId => {
        const layer = this.map.getLayer(layerId);
        if (layer.id.indexOf("Mask") >= 0) {
          this.map.reorderLayer(layer, 100);
        }
      });

      this._setLayerData(params);
    },

    onTopicHandler_hideDynamicRendererLayer: function () {

    }
  });
});
