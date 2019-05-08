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
    _getMapClickedCoordinate: function() {
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
      var regeoUrl = this.config.regeoUrl.replace(
        /{gisServer}/i,
        this.appConfig.gisServer
      );
      $.get(
        regeoUrl,
        {
          ak: this.config.ak,
          location: x + "," + y,
          pois: 1
        },
        function(response, status) {
          if (status === "success") {
            def.resolve(response);
          } else {
            def.reject();
          }
        },
        "jsonp"
      );
      return def;
    },

    onInputRouteStart_focus: function() {
      this._getMapClickedCoordinate().then(
        lang.hitch(this, function(startPoint) {
          this._reGeoCode(startPoint.x, startPoint.y).then(function (response) {
            if (response.message === "ok") {
              var result = response.result[0];
              var poiName;
              if (result.pois.length === 0) {
                poiName = result.formatted_address;
              } else {
                poiName = result.pois[0].name;
              }
              $("#inputRouteStart").val(poiName);

              $("#inputRouteEnd").trigger("focus");
            }
          });
        })
      );
    },

    onInputRouteEnd_focus: function() {
      this._getMapClickedCoordinate();
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
