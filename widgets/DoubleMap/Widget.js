define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/query",
  "dojo/on",
  "dojo/dom-construct",
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
  BaseWidget,
  Map,
  ArcGISTiledMapServiceLayer
) {
  return declare([BaseWidget], {
    name: "DoubleMap",
    baseClass: "jimu-widget-doubleMap",

    leftMap: null,
    rightMap: null,
    leftMapEventSignal: null,
    rightMapEventSignal: null,

    postCreate: function () {
      this.inherited(arguments);

      topic.subscribe("showDoubleMap", lang.hitch(this, this.onTopicHandler_showDoubleMap));
      topic.subscribe("hideDoubleMap", lang.hitch(this, this.onTopicHandler_hideDoubleMap));
    },

    onOpen: function () {
      this.leftMap = new Map("leftMap", {
        slider: false,
        nav: false,
        logo: false
      });

      this.rightMap = new Map("rightMap", {
        slider: false,
        nav: false,
        logo: false
      });

      this.leftMapEventSignal = this.leftMap.on("extent-change", lang.hitch(this, this._onLeftMap_extentChange));
      this.rightMapEventSignal = this.rightMap.on("extent-change", lang.hitch(this, this._onRightMap_extentChange));

      this._createBasemap();
    },

    _onLeftMap_extentChange: function (event) {
      this.rightMapEventSignal.remove();
      this.rightMap.setExtent(event.extent).then(lang.hitch(this, function () {
        this.rightMapEventSignal = this.rightMap.on("extent-change", lang.hitch(this, this._onRightMap_extentChange));
      }));
    },

    _onRightMap_extentChange: function (event) {
      this.leftMapEventSignal.remove();
      this.leftMap.setExtent(event.extent).then(lang.hitch(this, function () {
        this.leftMapEventSignal = this.leftMap.on("extent-change", lang.hitch(this, this._onLeftMap_extentChange));
      }));
    },

    _createBasemap: function () {
      this.appConfig.map.basemaps.forEach(function (basemapConfig, index) {
        var url = basemapConfig.url;
        url = url.replace(/{gisServer}/i, this.appConfig.gisServer);
        var type = basemapConfig.type;
        if (type === "tiled") {
          var leftLayer = new ArcGISTiledMapServiceLayer(url);
          //底图默认不可见
          leftLayer.setVisibility(false);
          //底图名称加入菜单
          domConstruct.place(
            "<li>" +
              "<a>" +
                "<i class='fa fa-picture-o'></i>" +
                basemapConfig.label +
              "</a>" +
            "</li>",
            this.leftBasemapMenu);

          var rightLayer = new ArcGISTiledMapServiceLayer(url);
          rightLayer.setVisibility(false);
          domConstruct.place(
            "<li>" +
              "<a>" +
                "<i class='fa fa-picture-o'></i>" +
                basemapConfig.label +
              "</a>" +
            "</li>",
            this.rightBasemapMenu);

          //左侧地图显示第一个底图
          if (index === 0) {
            leftLayer.setVisibility(true);
          }
          //右侧地图显示第二个底图
          else if (index === 1) {
            rightLayer.setVisibility(true);
          }

          this.leftMap.addLayer(leftLayer);
          this.rightMap.addLayer(rightLayer);
        }
      }, this);
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