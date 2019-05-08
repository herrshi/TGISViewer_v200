define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "dojo/Deferred",
  "jimu/BaseWidget",
  "esri/geometry/webMercatorUtils"
], function(declare, lang, topic, Deferred, BaseWidget, webMercatorUtils) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-Route",

    postCreate: function() {
      this.inherited(arguments);

      topic.subscribe(
        "showRoute",
        lang.hitch(this, this.onTopicHandler_showRoute)
      );
    },

    /**获取地图点击坐标*/
    _getMapClickedCoordinate: function(type) {
      var def = new Deferred();
      this.map.on("click", function(event) {
        var mapPoint = event.mapPoint;
        if (mapPoint.spatialReference.isWebMercator()) {
          mapPoint = webMercatorUtils.webMercatorToGeographic(mapPoint);
        }
        def.resolve(mapPoint);
      });
      return def;
    },

    /**逆地理编码，获取地图点击位置的地名*/
    _reGeoCode: function(x, y) {
      var def = new Deferred();

      return def;
    },

    onInputRouteStart_focus: function() {
      this._getMapClickedCoordinate("start").then(lang.hitch(this, function (startPoint) {
        this._reGeoCode(startPoint.x, startPoint.y);
      }));
    },

    onInputRouteEnd_focus: function() {
      this._getMapClickedCoordinate("end");
    },

    onBtnClose_click: function(event) {
      $("." + this.baseClass).addClass("hide");
    },

    onTopicHandler_showRoute: function(params) {
      var baseDom = $("." + this.baseClass);
      baseDom.css({
        left: params.position.left,
        top: params.position.top
      });
      baseDom.draggable();
      baseDom.removeClass("hide");
      $("#routeParam,#routeResult").removeClass("hide");
    }
  });
});
