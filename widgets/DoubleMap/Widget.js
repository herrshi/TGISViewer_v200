define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/query",
  "dojo/on",
  "dojo/dom-construct",
  "dojo/dom-attr",
  "dojox/NodeList/delegate",
  "jimu/BaseWidget",
  "esri/map",
  "esri/layers/ArcGISTiledMapServiceLayer",
  "esri/layers/ArcGISDynamicMapServiceLayer",
  "esri/layers/FeatureLayer",
  "jimu/CustomLayers/ChengDiDynamicMapServiceLayer"
], function (
  declare,
  lang,
  array,
  topic,
  query,
  on,
  domConstruct,
  domAttr,
  nodeListDelegate,
  BaseWidget,
  Map,
  ArcGISTiledMapServiceLayer,
  ArcGISDynamicMapServiceLayer,
  FeatureLayer,
  ChengDiDynamicMapServiceLayer
) {
  return declare([BaseWidget], {
    name: "DoubleMap",
    baseClass: "jimu-widget-doubleMap",

    _firstMap: null,
    _secondMap: null,
    _firstMapEventSignal: null,
    _secondMapEventSignal: null,
    _firstLayers: [],
    _secondLayers: [],

    postCreate: function () {
      this.inherited(arguments);

      topic.subscribe("showDoubleMap", lang.hitch(this, this.onTopicHandler_showDoubleMap));
      topic.subscribe("hideDoubleMap", lang.hitch(this, this.onTopicHandler_hideDoubleMap));
      topic.subscribe("addDoubleMapLayer", lang.hitch(this, this.onTopicHandler_addDoubleMapLayer));
      topic.subscribe("removeDoubleMapLayer", lang.hitch(this, this.onTopicHandler_removeDoubleMapLayer));

      topic.subscribe("changeBasemapInDoubleMap", lang.hitch(this, this._onTopicHandler_basemapChangeInDoubleMap));
    },

    onOpen: function () {
      this._firstMap = new Map("firstMap", {
        slider: false,
        nav: false,
        logo: false
      });

      this._secondMap = new Map("secondMap", {
        slider: false,
        nav: false,
        logo: false
      });

      //监听地图extent-change事件, 使另一个地图的extent与之联动
      this._firstMapEventSignal = this._firstMap.on("extent-change", lang.hitch(this, this._onFirstMap_extentChange));
      this._secondMapEventSignal = this._secondMap.on("extent-change", lang.hitch(this, this._onSecondMap_extentChange));

      //底图列表的点击
      query(".dropdown-menu-black").delegate("a", "onclick", function (evt) {
        var label = domAttr.get(evt.target, "data-label");
        var dir = domAttr.get(evt.target, "data-dir");
        topic.publish("changeBasemapInDoubleMap", {dir: dir, label: label});
      });

      this._createBasemap();
    },

    _onFirstMap_extentChange: function (event) {
      //先解除对其他地图的事件监听, 防止死循环
      this._secondMapEventSignal.remove();
      this._secondMap.setExtent(event.extent).then(lang.hitch(this, function () {
        this._secondMapEventSignal = this._secondMap.on("extent-change", lang.hitch(this, this._onSecondMap_extentChange));
      }));
    },

    _onSecondMap_extentChange: function (event) {
      //先解除对其他地图的事件监听, 防止死循环
      this._firstMapEventSignal.remove();
      this._firstMap.setExtent(event.extent).then(lang.hitch(this, function () {
        this._firstMapEventSignal = this._firstMap.on("extent-change", lang.hitch(this, this._onFirstMap_extentChange));
      }));
    },

    _onTopicHandler_basemapChangeInDoubleMap: function (params) {
      if (params.dir === "first") {
        this._firstLayers.forEach(function (firstMapLayer, index) {
          firstMapLayer.setVisibility(firstMapLayer.label === params.label);
        });
      }
      else if (params.dir === "second") {
        this._secondLayers.forEach(function (secondMapLayer, index) {
          secondMapLayer.setVisibility(secondMapLayer.label === params.label);
        });
      }
    },

    _createBasemap: function () {
      this.appConfig.map.basemaps.forEach(function (basemapConfig, index) {
        var url = basemapConfig.url;
        url = url.replace(/{gisServer}/i, this.appConfig.gisServer);
        url = url.replace(/{token}/i, window.serviceToken);
        var type = basemapConfig.type;
        if (type === "tiled") {
          var firstLayer = new ArcGISTiledMapServiceLayer(url);
          firstLayer.label = basemapConfig.label;
          //底图默认不可见
          firstLayer.setVisibility(false);
          //底图名称加入菜单
          domConstruct.place(
            "<li>" +
              "<a data-dir='first' data-label='" + basemapConfig.label + "'>" +
                "<i class='fa fa-picture-o'></i>" +
                basemapConfig.label +
              "</a>" +
            "</li>",
            this.leftBasemapMenu);

          var secondLayer = new ArcGISTiledMapServiceLayer(url);
          secondLayer.label = basemapConfig.label;
          secondLayer.setVisibility(false);
          domConstruct.place(
            "<li>" +
              "<a data-dir='second' data-label='" + basemapConfig.label + "'>" +
                "<i class='fa fa-picture-o'></i>" +
                basemapConfig.label +
              "</a>" +
            "</li>",
            this.rightBasemapMenu);

          //如果只有一个底图, 两侧同时显示, 并且不显示底图列表
          if (this.appConfig.map.basemaps.length === 1) {
            firstLayer.setVisibility(true);
            secondLayer.setVisibility(true);
            query(".btn-group").style("display", "none");
          }
          //有多个底图时
          //左侧地图显示第一个底图
          else if (index === 0) {
            firstLayer.setVisibility(true);
          }
          //右侧地图显示第二个底图
          else if (index === 1) {
            secondLayer.setVisibility(true);
          }

          this._firstMap.addLayer(firstLayer);
          this._secondMap.addLayer(secondLayer);

          this._firstLayers.push(firstLayer);
          this._secondLayers.push(secondLayer);
        }
      }, this);
    },

    _findLayerInMap: function (label, ids) {
      var resultLayer;
      //dynamic layers
      for (var i = 0; i < this.map.layerIds.length; i++) {
        var layer = this.map.getLayer(this.map.layerIds[i]);
        if (layer.label === label && layer instanceof ArcGISDynamicMapServiceLayer) {
          resultLayer = new ArcGISDynamicMapServiceLayer(layer.url);
          resultLayer.label = layer.label;
          resultLayer.infoTemplates = layer.infoTemplates;

          if (ids.length === 0) {
            //获取服务中所有的layerId
            layer.layerInfos.forEach(function (layerInfo) {
              ids.push(layerInfo.id);
              if (layerInfo.subLayerIds !== null) {
                ids.push(layerInfo.subLayerIds);
              }
            });
          }
          resultLayer.setVisibleLayers(ids);
          return resultLayer;
        }
      }

      for (i = 0; i < this.map.graphicsLayerIds.length; i++) {
        layer = this.map.getLayer(this.map.graphicsLayerIds[i]);
        if (layer.label === label && layer instanceof  FeatureLayer) {
          resultLayer = new FeatureLayer(layer.url);
          resultLayer.label = layer.label;
          resultLayer.infoTemplate = layer.infoTemplate;
          resultLayer.renderer = layer.renderer;
          resultLayer.refreshInterval = layer.refreshInterval;
          resultLayer.outFields = layer.outFields;
          resultLayer.opacity = layer.opacity;
          return resultLayer;
        }
      }
    },

    _createLayer: function (label, type, url) {
      var resultLayer;

      switch (type) {
        case "dynamic":
          resultLayer = new ArcGISDynamicMapServiceLayer(url);
          break;

        case "ChengDiDynamic":
          if (url.indexOf("http") < 0) {
            url = this.appConfig.CADServiceUrl.replace(/{name}/i, url);
          }
          resultLayer = new ChengDiDynamicMapServiceLayer(url);
          break;
      }
      resultLayer.label = label;

      return resultLayer;
    },

    _getMap: function (mapIndex) {
      switch (mapIndex) {
        case "1":
          return this._firstMap;

        case "2":
          return this._secondMap;

        default:
          return this._firstMap;
      }
    },

    onTopicHandler_addDoubleMapLayer: function (params) {
      var label = params.label || "";
      var ids = params.ids || [];
      var type = params.type || "dynamic";
      var url = params.url || "";
      var mapIndex = params.mapIndex;

      //确定加入到哪个地图中
      var map = this._getMap(mapIndex);

      if (label !== "") {
        var layerToAdd;
        //配置过的图层
        layerToAdd = this._findLayerInMap(label, ids);
        if (layerToAdd !== undefined) {
          map.addLayer(layerToAdd);
        }
        //新增图层
        else {
          layerToAdd = this._createLayer(label, type, url);
          if (layerToAdd !== undefined) {
            map.addLayer(layerToAdd);
          }
        }
      }
    },

    onTopicHandler_removeDoubleMapLayer: function (params) {
      var label = params.label || "";
      var mapIndex = params.mapIndex;

      var map = this._getMap(mapIndex);
      for (var i = 0; i < map.layerIds.length; i++) {
        var layer = map.getLayer(map.layerIds[i]);
        if (layer.label === label) {
          map.removeLayer(layer);
          return;
        }
      }

      for (i = 0; i < this.map.graphicsLayerIds.length; i++) {
        layer = map.getLayer(map.graphicsLayerIds[i]);
        if (layer.label === label) {
          map.removeLayer(layer);
          return;
        }
      }
    },

    onTopicHandler_showDoubleMap: function (params) {
      //显示div
      query("." + this.baseClass).style({
        "width": "100%",
        "height": "100%",
        "display": "block",
        "z-index": 100
      });

      // var direction = params ?  params.direction || "horizontal" : "horizontal";

    },

    onTopicHandler_hideDoubleMap: function () {
      //隐藏div
      query("." + this.baseClass).style("display", "none");
    }
  });

});