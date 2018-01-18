define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/query",
  "dojo/on",
  "dojo/dom-construct",
  "jimu/BaseWidget",
  "esri/map"
], function (
  declare,
  lang,
  array,
  topic,
  query,
  on,
  domConstruct,
  BaseWidget,
  Map
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
        center: [121, 31],
        slider:false,
        nav:false,
        zoom: 12,
        basemap: "topo"
      });

      this.rightMap = new Map("rightMap", {
        center: [121, 31],
        slider:false,
        nav:false,
        zoom: 12,
        basemap: "streets"
      });

      this.leftMapEventSignal = this.leftMap.on("extent-change", lang.hitch(this, this._onLeftMap_extentChange));
      this.rightMapEventSignal = this.rightMap.on("extent-change", lang.hitch(this, this._onRightMap_extentChange));

     this._addBasemapMenu(this.leftBasemapMenu, this.config.basemapLabels);
     this._addBasemapMenu(this.rightBasemapMenu, this.config.basemapLabels);
    },

    _addBasemapMenu: function (parentNode, layerLabels) {
      array.forEach(layerLabels, function (layerLabel) {
        domConstruct.place("<li><a><i class='fa fa-picture-o'></i>" + layerLabel + "</a></li>", parentNode);
      }, this);
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
      query("." + this.baseClass).style("display", "none");
    }
  });

});