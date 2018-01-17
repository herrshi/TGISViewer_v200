define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/query",
  "dojo/on",
  "jimu/BaseWidget",
  "esri/map",
  "esri/dijit/BasemapGallery"
], function (
  declare,
  lang,
  array,
  topic,
  query,
  on,
  BaseWidget,
  Map,
  BasemapGallery
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
      console.log(this.map.basemapLayerIds);
      console.log(this.map.layerIds);

      this.leftMap = new Map("leftMap", {
        center: [121, 31],
        slider:false,
        nav:false,
        zoom: 12,
        basemap: "topo"
      });
      var leftBasemapGallery = new BasemapGallery({
        showArcGISBasemaps: true,
        map: this.leftMap
      }, this.leftBasemapContainer);
      leftBasemapGallery.startup();

      this.rightMap = new Map("rightMap", {
        center: [121, 31],
        slider:false,
        nav:false,
        zoom: 12,
        basemap: "streets"
      });
      var rightBasemapGallery = new BasemapGallery({
        showArcGISBasemaps: true,
        map: this.rightMap
      }, this.rightBasemapContainer);
      rightBasemapGallery.startup();

      this.leftMapEventSignal = this.leftMap.on("extent-change", lang.hitch(this, this._onLeftMap_extentChange));
      this.rightMapEventSignal = this.rightMap.on("extent-change", lang.hitch(this, this._onRightMap_extentChange));
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