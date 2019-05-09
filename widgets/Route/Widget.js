define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "dojo/Deferred",
  "jimu/BaseWidget",
  "esri/graphic",
  "esri/geometry/Point",
  "esri/layers/GraphicsLayer",
  "esri/symbols/PictureMarkerSymbol",
  "esri/geometry/webMercatorUtils"
], function(
  declare,
  lang,
  topic,
  Deferred,
  BaseWidget,
  Graphic,
  Point,
  GraphicsLayer,
  PictureMarkerSymbol,
  webMercatorUtils
) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-Route",

    startPointSymbol: null,
    endPointSymbol: null,
    startPoint: null,
    endPoint: null,
    routeLayer: null,

    postCreate: function() {
      this.inherited(arguments);

      this.startPointSymbol = new PictureMarkerSymbol({
        url: window.path + "images/mapIcons/icon_gis_green_baojing.png",
        width: 23.625,
        height: 30.75,
        yoffset: 15.375
      });
      this.endPointSymbol = new PictureMarkerSymbol({
        url: window.path + "images/mapIcons/icon_gis_red_baojing.png",
        width: 23.625,
        height: 30.75,
        yoffset: 15.375
      });

      this.routeLayer = new GraphicsLayer();
      this.map.addLayer(this.routeLayer);

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
          if (status === "success" && response.message === "ok") {
            //附近没有poi就用位置描述，有poi就用最近的poi名称
            var result = response.result[0];
            var poiName =
              result.pois.length === 0
                ? result.formatted_address
                : result.pois[0].name;
            def.resolve(poiName);
          } else {
            def.reject();
          }
        },
        "jsonp"
      );
      return def;
    },

    _findRoute: function() {
      var routeUrl = this.config.routeUrl.replace(
        /{gisServer}/i,
        this.appConfig.gisServer
      );

      $.get(
        routeUrl,
        {
          ak: this.config.ak,
          origin: this.startPoint.x + "," + this.startPoint.y,
          destination: this.endPoint.x + "," + this.endPoint.y
        },
        function(response, status) {
          if (status === "success" && response.message === "ok") {
            console.log(response);
          }
        },
        "jsonp"
      );
    },

    /**起点输入框focus后，在地图上点击获取起点*/
    onInputRouteStart_focus: function() {
      this._getMapClickedCoordinate().then(
        lang.hitch(this, function(point) {
          //添加起点图标
          var graphic = new Graphic(point, this.startPointSymbol);
          graphic.id = "start";
          this.routeLayer.add(graphic);

          this._reGeoCode(point.x, point.y).then(
            lang.hitch(this, function(poiName) {
              this.startPoint = point;
              $("#inputRouteStart").val(poiName);
              //确定起点以后自动开始输入终点
              $("#inputRouteEnd").trigger("focus");
            })
          );
        })
      );
    },

    onBtnClearStart_click: function() {
      this.startPoint = null;

      //清除地图上的起点图标
      for (var i = 0; i < this.routeLayer.graphics.length; i++) {
        var graphic = this.routeLayer.graphics[i];
        if (graphic.id === "start") {
          this.routeLayer.remove(graphic);
          break;
        }
      }

      //清空输入，等待重新输入
      var inputRouteStart = $("#inputRouteStart");
      inputRouteStart.val("");
      inputRouteStart.trigger("focus");
    },

    onInputRouteEnd_focus: function() {
      this._getMapClickedCoordinate().then(
        lang.hitch(this, function(point) {
          //添加终点图标
          var graphic = new Graphic(point, this.endPointSymbol);
          graphic.id = "end";
          this.routeLayer.add(graphic);

          this._reGeoCode(point.x, point.y).then(
            lang.hitch(this, function(poiName) {
              this.endPoint = point;
              $("#inputRouteEnd").val(poiName);

              if (this.startPoint && this.endPoint) {
                this._findRoute();
              }
            })
          );
        })
      );
    },

    onBtnClearEnd_click: function() {
      this.endPoint = null;

      //清除地图上的终点图标
      for (var i = 0; i < this.routeLayer.graphics.length; i++) {
        var graphic = this.routeLayer.graphics[i];
        if (graphic.id === "end") {
          this.routeLayer.remove(graphic);
          break;
        }
      }

      //清空输入，等待重新输入
      var inputRouteEnd = $("#inputRouteEnd");
      inputRouteEnd.val("");
      inputRouteEnd.trigger("focus");
    },

    onBtnClose_click: function() {
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

      //输入起点
      $("#inputRouteStart").trigger("focus");
    }
  });
});
