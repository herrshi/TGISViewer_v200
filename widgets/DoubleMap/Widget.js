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
  "esri/layers/ArcGISTiledMapServiceLayer"
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
  ArcGISTiledMapServiceLayer
) {
  return declare([BaseWidget], {
    name: "DoubleMap",
    baseClass: "jimu-widget-doubleMap",

    firstMap: null,
    secondMap: null,
    firstMapEventSignal: null,
    secondMapEventSignal: null,
    firstLayers: [],
    secondLayers: [],

    postCreate: function () {
      this.inherited(arguments);

      topic.subscribe("showDoubleMap", lang.hitch(this, this.onTopicHandler_showDoubleMap));
      topic.subscribe("hideDoubleMap", lang.hitch(this, this.onTopicHandler_hideDoubleMap));
      topic.subscribe("addDoubleMapLayer", lang.hitch(this, this.onTopicHandler_addDoubleMapLayer));

      topic.subscribe("changeBasemapInDoubleMap", lang.hitch(this, this._onTopicHandler_basemapChangeInDoubleMap));
    },

    onOpen: function () {
      this.firstMap = new Map("firstMap", {
        slider: false,
        nav: false,
        logo: false
      });

      this.secondMap = new Map("secondMap", {
        slider: false,
        nav: false,
        logo: false
      });

      this.firstMapEventSignal = this.firstMap.on("extent-change", lang.hitch(this, this._onLeftMap_extentChange));
      this.secondMapEventSignal = this.secondMap.on("extent-change", lang.hitch(this, this._onRightMap_extentChange));

      query(".dropdown-menu-black").delegate("a", "onclick", function (evt) {
        var label = domAttr.get(evt.target, "data-label");
        var dir = domAttr.get(evt.target, "data-dir");
        topic.publish("changeBasemapInDoubleMap", {dir: dir, label: label});
      });

      this._createBasemap();
    },

    _onLeftMap_extentChange: function (event) {
      //先解除对右侧地图的事件监听, 防止死循环
      this.secondMapEventSignal.remove();
      this.secondMap.setExtent(event.extent).then(lang.hitch(this, function () {
        this.secondMapEventSignal = this.secondMap.on("extent-change", lang.hitch(this, this._onRightMap_extentChange));
      }));
    },

    _onRightMap_extentChange: function (event) {
      //先解除对左侧地图的事件监听, 防止死循环
      this.firstMapEventSignal.remove();
      this.firstMap.setExtent(event.extent).then(lang.hitch(this, function () {
        this.firstMapEventSignal = this.firstMap.on("extent-change", lang.hitch(this, this._onLeftMap_extentChange));
      }));
    },

    _onTopicHandler_basemapChangeInDoubleMap: function (params) {
      if (params.dir === "left") {
        this.firstLayers.forEach(function (leftLayer, index) {
          leftLayer.setVisibility(leftLayer.label === params.label);
        });
      }
      else if (params.dir === "right") {
        this.secondLayers.forEach(function (rightLayer, index) {
          rightLayer.setVisibility(rightLayer.label === params.label);
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
              "<a data-dir='left' data-label='" + basemapConfig.label + "'>" +
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
              "<a data-dir='right' data-label='" + basemapConfig.label + "'>" +
                "<i class='fa fa-picture-o'></i>" +
                basemapConfig.label +
              "</a>" +
            "</li>",
            this.rightBasemapMenu);

          //如果只有一个底图, 两侧同时显示
          if (this.appConfig.map.basemaps.length === 1) {
            firstLayer.setVisibility(true);
            secondLayer.setVisibility(true);
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

          this.firstMap.addLayer(firstLayer);
          this.secondMap.addLayer(secondLayer);

          this.firstLayers.push(firstLayer);
          this.secondLayers.push(secondLayer);
        }
      }, this);
    },

    _addLayerFromLabel: function (label, map) {
      for (var i = 0; i < this.appConfig.operationallayers.length; i++) {
        var layerConfig = this.appConfig.operationallayers[i];
        if (layerConfig.label === label) {
          var layerType = layerConfig.type;

          break;
        }
      }
    },

    onTopicHandler_addDoubleMapLayer: function (params) {
      var layerLabel = params.layerLabel || "";
      var layerType = params.layerType;
      var layerUrl = params.layerUrl;
      var mapIndex = params.mapIndex;

      //确定加入到哪个地图中
      var map;
      switch (mapIndex) {
        case "1":
          map = this.firstMap;
          break;

        case "2":
          map = this.secondMap;
          break;

        default:
          map = this.firstMap;
      }

      //配置过的图层
      if (layerLabel !== "") {
        this._addLayerFromLabel(layerLabel, map);
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