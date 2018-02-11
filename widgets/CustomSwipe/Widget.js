/**
 * Created by herrshi on 2017/6/22.
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/dom-construct",
  "dojo/topic",
  "jimu/BaseWidget",
  "esri/dijit/LayerSwipe",
  "esri/layers/ArcGISDynamicMapServiceLayer",
  "esri/layers/ArcGISTiledMapServiceLayer"
], function (
  declare,
  lang,
  array,
  domConstruct,
  topic,
  BaseWidget,
  LayerSwipe,
  ArcGISDynamicMapServiceLayer,
  ArcGISTiledMapServiceLayer
) {
  var clazz = declare([BaseWidget], {
    name: "CustomSwipe",
    _swipeWidget: null,

    _swipeLayers: null,
    _referenceLayers: null,
    //记录从不可见改为可见的图层
    _visibilityChangedLayers: null,

    postCreate: function () {
      this.inherited(arguments);

      topic.subscribe("startSwipe", lang.hitch(this, this.onTopicHandler_startSwipe));
      topic.subscribe("stopSwipe", lang.hitch(this, this.onTopicHandler_stopSwipe));
      topic.subscribe("addSwipeLayer", lang.hitch(this, this.onTopicHandler_addSwipeLayer));
      topic.subscribe("removeSwipeLayer", lang.hitch(this, this.onTopicHandler_removeSwipeLayer));
    },

    /**
     * 从label和url获取layer对象
     * 若在map中找到label，就用这个layer的url新建一个layer
     * 若没有找到就用url新建一个layer，加到map上
     * */
    _addLayerToMap: function (layerObj) {
      var layer;

      var layerLabel = layerObj.label;
      var layerUrl = layerObj.url;
      var ids = layerObj.ids;

      if (layerLabel && layerLabel !== "") {
        for (var i = 0; i < this.map.layerIds.length; i++) {
          layer = this.map.getLayer(this.map.layerIds[i]);
          //label一样
          if (layer.label === layerLabel) {
            layerUrl = layer.url;
            break;
          }
        }
      }

      if (layerUrl && layerUrl !== "") {
        layer = new ArcGISDynamicMapServiceLayer(layerUrl);
        layer.label = layerLabel;
        if (ids && ids.length > 0) {
          if (!layer.visibleLayers) {
            layer.setVisibleLayers(ids);
          }
          else {
            layer.setVisibleLayers(layer.visibleLayers.concat(ids));
          }

        }
        //不管是对比图层还是参考图层都需要加到map上
        this.map.addLayer(layer);
        return layer;
      }
      else {
        return null;
      }
    },

    onTopicHandler_startSwipe: function (params) {
      this._swipeLayers = [];
      this._referenceLayers = [];
      this._visibilityChangedLayers = [];

      //参考图层要放在下方
      if (params._referenceLayers) {
        array.forEach(params._referenceLayers, function (referenceLayerObj) {
          var referenceLayer = this._addLayerToMap(referenceLayerObj);
          this._referenceLayers.push(referenceLayer);
        }, this);
      }

      //对比图层要放在参考图层上方
      if (params._swipeLayers) {
        array.forEach(params._swipeLayers, function (swipeLayerObj) {
          var swipeLayer = this._addLayerToMap(swipeLayerObj);
          this._swipeLayers.push(swipeLayer);
        }, this);
      }

      if (this._swipeLayers.length === 0) {
        return;
      }

      if (!this._swipeWidget) {
        this._swipeWidget = new LayerSwipe({
          type: params.swipeType || "vertical",
          map: this.map,
          layers: this._swipeLayers
        }, domConstruct.create("div", {}, window.jimuConfig.mapId, "first"));
      }
      else {
        this._swipeWidget.layers = this._swipeLayers;
      }
      if (!this._swipeWidget.enabled) {
        this._swipeWidget.enable();
      }
      this._swipeWidget.startup();
    },

    onTopicHandler_stopSwipe: function () {
      if (this._swipeWidget) {
        //把map恢复到开始卷帘前的状态
        array.forEach(this.addedLayers, function (layer) {
          this.map.removeLayer(layer);
        }, this);
        this._swipeLayers = [];
        this._referenceLayers = [];
        this._swipeWidget.disable();
      }
    },

    onTopicHandler_addSwipeLayer: function (params) {
      if (!this._swipeWidget) {
        return;
      }

      var layerType = params.layerType.toLowerCase();
      var layerLabel = params.layer.label;
      var ids = params.layer.ids;

      if (layerType === "swipe") {
        array.forEach(this._swipeLayers, function (swipeLayer) {
          //如果此图层已存在，就添加图层id
          if (swipeLayer.label === layerLabel) {
            swipeLayer.setVisibleLayers(swipeLayer.visibleLayers.concat(ids));
            return;
          }
        }, this);

        //此图层不存在就新增一个
        var swipeLayer = this._addLayerToMap(params.layer);
        this._swipeLayers.push(swipeLayer);
      }
      else if (layerType === "reference") {
        array.forEach(this._referenceLayers, function (referenceLayer) {
          //如果此图层已存在，就添加图层id
          if (referenceLayer.label === layerLabel) {
            referenceLayer.setVisibleLayers(referenceLayer.visibleLayers.concat(ids));
            return;
          }
        }, this);

        //此图层不存在就新增一个
        var referenceLayer = this._addLayerToMap(params.layer);
        //参考图层放在下面，不要遮住对比图层
        //找到最后一个切片图的位置，新图层放在切片图上方第一个
        for (var i = 0; i < this.map.layerIds.length; i++) {
          var layer = this.map.getLayer(this.map.layerIds[i]);
          if (!(layer instanceof ArcGISTiledMapServiceLayer)) {
            break;
          }
        }
        this.map.reorderLayer(referenceLayer, i);
        this._referenceLayers.push(referenceLayer);
      }
    },

    _removeLayer: function (layerObj, layers) {
      var layerLabel = layerObj.label;
      var ids = layerObj.ids;


      for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        if (layer.label === layerLabel) {
          //不传id则删除整个图层
          if (!ids || ids.length === 0) {
            layers.splice(i, 1);
            this.map.removeLayer(layer);
            return;
          }
          //把图层里的某几个sublayer设为不可见
          else {
            var visibleLayers = layer.visibleLayers;
            for (var j = 0; j < ids.length; j++) {
              if (visibleLayers.indexOf(ids[j]) >= 0) {
                visibleLayers.splice(visibleLayers.indexOf(ids[j]), 1);
              }
            }

            //如果所有sublayer都不可见就删掉整个图层
            if (visibleLayers.length === 0) {
              layers.splice(i, 1);
              this.map.removeLayer(layer);
            }
            else {
              layer.setVisibleLayers(visibleLayers);
            }
          }
        }
      }
    },

    onTopicHandler_removeSwipeLayer: function (params) {
      if (!this._swipeWidget) {
        return;
      }

      var layerType = params.layerType.toLowerCase();

      if (layerType === "swipe") {
        this._removeLayer(params.layer, this._swipeLayers);
      }
      else if (layerType === "reference") {
        this._removeLayer(params.layer, this._referenceLayers);
      }


    }
  });

  return clazz;

});
