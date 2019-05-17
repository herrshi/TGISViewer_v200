define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "jimu/BaseWidget",
  "esri/graphic",
  "esri/geometry/webMercatorUtils",
  "esri/layers/GraphicsLayer",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/PictureMarkerSymbol",
  "esri/toolbars/draw",
  "esri/geometry/geometryEngine"
], function(
  declare,
  lang,
  topic,
  BaseWidget,
  Graphic,
  webMercatorUtils,
  GraphicsLayer,
  SimpleLineSymbol,
  SimpleFillSymbol,
  PictureMarkerSymbol,
  Draw,
  geometryEngine
) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-Measurement",

    drawToolbar: null,

    pointSymbol: null,
    polylineSymbol: null,
    polygonSymbol: null,
    drawLayer: null,

    mapMouseMoveHandler: null,

    //记录原始数据，用于单位转换
    polygonLength: null,
    polygonArea: null,
    polylineLength: null,

    postCreate: function() {
      this.inherited(arguments);

      this.pointSymbol = new PictureMarkerSymbol({
        url: window.path + "images/mapIcons/esriGreenPin16x26.png",
        width: 12,
        height: 19.5,
        yoffset: 10
      });
      this.polylineSymbol = new SimpleLineSymbol({
        color: [0, 128, 255],
        width: 3
      });
      this.polygonSymbol = new SimpleFillSymbol({
        type: "esriSFS",
        style: "esriSFSSolid",
        color: [0, 0, 0, 128],
        outline: {
          color: [0, 128, 255],
          width: 3
        }
      });

      this.drawLayer = new GraphicsLayer();
      this.map.addLayer(this.drawLayer);

      this.drawToolbar = new Draw(this.map);
      this.drawToolbar.setLineSymbol(this.polylineSymbol);
      this.drawToolbar.setFillSymbol(this.polygonSymbol);
      this.drawToolbar.on(
        "draw-complete",
        lang.hitch(this, this.onDrawToolbar_drawComplete)
      );

      topic.subscribe(
        "showMeasurement",
        lang.hitch(this, this.onTopicHandler_showMeasurement)
      );
    },

    _clearResult: function() {
      this.drawLayer.clear();

      $("#polygonLength").html("");
      $("#polygonArea").html("");

      $("#polylineLength").html("");

      $("#cursorCoordinateX").html("");
      $("#cursorCoordinateY").html("");
      $("#pinCoordinateX").html("");
      $("#pinCoordinateY").html("");
    },

    onDrawToolbar_drawComplete: function(event) {
      this.drawLayer.clear();

      var graphic = new Graphic(event.geometry);
      switch (event.geometry.type) {
        case "point":
          graphic.symbol = this.pointSymbol;

          //显示点击位置坐标
          var point = graphic.geometry;
          if (this.map.spatialReference.isWebMercator()) {
            point = webMercatorUtils.webMercatorToGeographic(point);
          }
          $("#pinCoordinateX").html(point.x.toFixed(6));
          $("#pinCoordinateY").html(point.y.toFixed(6));
          break;

        case "polyline":
          graphic.symbol = this.polylineSymbol;

          //计算长度，单位km
          this.polylineLength = geometryEngine.geodesicLength(
            graphic.geometry,
            "kilometers"
          );
          //从km换算到当前单位
          var polylineLength =
            this.polylineLength /
            $("#polylineLengthUnit")
              .find("option:selected")
              .attr("data-converter");
          $("#polylineLength").html(polylineLength.toFixed(2));
          break;

        case "polygon":
          graphic.symbol = this.polygonSymbol;

          //计算周长，单位km
          this.polygonLength = geometryEngine.geodesicLength(
            graphic.geometry,
            "kilometers"
          );
          //从km换算到当前单位
          var polygonLength =
            this.polygonLength /
            $("#polygonLengthUnit")
              .find("option:selected")
              .attr("data-converter");
          $("#polygonLength").html(polygonLength.toFixed(2));

          //计算面积，单位km^2
          this.polygonArea = geometryEngine.geodesicArea(
            graphic.geometry,
            "square-kilometers"
          );
          //从km^2换算到当前单位
          var polygonArea =
            this.polygonArea /
            $("#polygonAreaUnit")
              .find("option:selected")
              .attr("data-converter");
          $("#polygonArea").html(polygonArea.toFixed(2));
          break;
      }
      this.drawLayer.add(graphic);
    },

    onMap_mousemove: function(event) {
      //显示当前位置坐标
      var point = event.mapPoint;
      if (this.map.spatialReference.isWebMercator()) {
        point = webMercatorUtils.webMercatorToGeographic(point);
      }
      $("#cursorCoordinateX").html(point.x.toFixed(6));
      $("#cursorCoordinateY").html(point.y.toFixed(6));
    },

    onBtnClose_click: function() {
      if (this.mapMouseMoveHandler) this.mapMouseMoveHandler.remove();
      this._clearResult();
      $("." + this.baseClass).addClass("hide");
      this.drawToolbar.deactivate();
    },

    onListMeasureType_click: function(event) {
      var currentTarget = $(event.currentTarget);
      if (!$(event.currentTarget).hasClass("active")) {
        this._clearResult();

        $("#listMeasureType>li").removeClass("active");
        currentTarget.addClass("active");

        var drawType = currentTarget.attr("data-drawType").toUpperCase();
        this.drawToolbar.activate(Draw[drawType]);

        $("#measurementResult>div").addClass("hide");
        switch (drawType) {
          case "POLYGON":
            $("#polygonResult").removeClass("hide");
            if (this.mapMouseMoveHandler) this.mapMouseMoveHandler.remove();
            break;

          case "POLYLINE":
            $("#polylineResult").removeClass("hide");
            if (this.mapMouseMoveHandler) this.mapMouseMoveHandler.remove();
            break;

          case "POINT":
            $("#pointResult").removeClass("hide");
            this.mapMouseMoveHandler = this.map.on(
              "mouse-move",
              lang.hitch(this, this.onMap_mousemove)
            );

            break;
        }
      }
    },

    onPolygonLengthUnit_change: function() {
      var polygonLength = $("#polygonLength");
      if (polygonLength.html() !== "") {
        var length =
          this.polygonLength /
          $("#polygonLengthUnit")
            .find("option:selected")
            .attr("data-converter");
        polygonLength.html(length.toFixed(2));
      }
    },

    onPolygonAreaUnit_change: function() {
      var polygonArea = $("#polygonArea");
      if (polygonArea.html() !== "") {
        var length =
          this.polygonArea /
          $("#polygonAreaUnit")
            .find("option:selected")
            .attr("data-converter");
        polygonArea.html(length.toFixed(2));
      }
    },

    onPolylineLengthUnit_change: function() {
      var polylineLength = $("#polylineLength");
      if (polylineLength.html() !== "") {
        var length =
          this.polylineLength /
          $("#polylineLengthUnit")
            .find("option:selected")
            .attr("data-converter");
        polylineLength.html(length.toFixed(2));
      }
    },

    onTopicHandler_showMeasurement: function(params) {
      var baseDom = $("." + this.baseClass);
      baseDom.css({
        left: params.position.left,
        top: params.position.top,
        height: "auto"
      });
      baseDom.draggable();
      baseDom.removeClass("hide");

      $("#listMeasureType>li")
        .off("click")
        .on("click", lang.hitch(this, this.onListMeasureType_click));

      this.drawToolbar.activate(
        Draw[
          $("#listMeasureType>li.active")
            .attr("data-drawType")
            .toUpperCase()
        ]
      );
    }
  });
});
