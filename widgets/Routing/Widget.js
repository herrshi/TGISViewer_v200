/**
 * 由路口连成的路径
 * 选择一个路口以后, 地图上标出下游路口
 * */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/keys",
  "dojo/query",
  "dojo/dom-attr",
  "dojo/request/xhr",
  "dojo/Deferred",
  "dojo/promise/all",
  "dojo/dom-construct",
  "dojo/dom-style",
  "jimu/BaseWidget",
  "esri/Color",
  "esri/graphic",
  "esri/geometry/Point",
  "esri/geometry/Polyline",
  "esri/geometry/jsonUtils",
  "esri/geometry/webMercatorUtils",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/TextSymbol",
  "esri/symbols/Font",
  "esri/renderers/SimpleRenderer",
  "esri/tasks/query",
  "esri/tasks/QueryTask",
  "esri/dijit/InfoWindow"
], function(
  declare,
  lang,
  array,
  topic,
  keys,
  query,
  domAttr,
  xhr,
  Deferred,
  all,
  domConstruct,
  domStyle,
  BaseWidget,
  Color,
  Graphic,
  Point,
  Polyline,
  geometryJsonUtils,
  webMercatorUtils,
  FeatureLayer,
  GraphicsLayer,
  PictureMarkerSymbol,
  SimpleLineSymbol,
  TextSymbol,
  Font,
  SimpleRenderer,
  Query,
  QueryTask,
  InfoWindow
) {
  return declare([BaseWidget], {
    name: "Routing",
    _routingLayer: null,

    _startPointSymbol: null,
    _endPointSymbol: null,
    _wayPointsSymbol: null,
    _routePointsSymbol: null,
    _routeLineSymbol: null,
    _LineSymbol: null,

    _startPoint: null,
    _endPoint: null,
    _wayPoints: null,
    _routeGraphic: null,
    _routeLine: null,
    _routeLineStart: null,
    _routeLineEnd: null,

    _routeLayer: null,
    _tooltipDiv: null,

    _bufferDistance: 0,

    postCreate: function() {
      this.inherited(arguments);
      this._routeLayer = new GraphicsLayer();
      this.map.addLayer(this._routeLayer);
      this._tooltipDiv = domConstruct.place(
        "<div id='Routingtooltip' class='tooltipDiv'></div>",
        document.getElementById(this.map.container.id)
      );

      this._startPointSymbol = new PictureMarkerSymbol({
        url: "images/mapIcons/start.png",
        height: 31,
        width: 19,
        type: "esriPMS",
        xoffset: 0,
        yoffset: 16
      });
      this._endPointSymbol = new PictureMarkerSymbol({
        url: "images/mapIcons/end.png",
        height: 31,
        width: 19,
        type: "esriPMS",
        xoffset: 0,
        yoffset: 16
      });
      this._wayPointsSymbol = new PictureMarkerSymbol({
        url: "images/mapIcons/mid.png",
        height: 31,
        width: 19,
        type: "esriPMS",
        xoffset: 0,
        yoffset: 16
      });
      this._routePointsSymbol = new PictureMarkerSymbol({
        url: "images/BlueSphere.png",
        height: 32,
        width: 32,
        type: "esriPMS"
      });
      this._routeLineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([27, 172, 46]),
        4
      );
      /*this._routeLineSymbol.setMarker({
        style: "arrow",
        placement: "begin-end"
      });*/
      this._LineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SHORTDASH,
        new Color([105, 105, 105]),
        4
      );
      topic.subscribe(
        "routeSearch",
        lang.hitch(this, this.onTopicHandler_routeSearch)
      );
      topic.subscribe(
        "clearRouteSearch",
        lang.hitch(this, this.onTopicHandler_clearRouteSearch)
      );

      //var infoWindow = new InfoWindow({}, domConstruct.create("div"));
      //infoWindow.startup();
      //this.map.infoWindow = infoWindow;
      this._routeLayer.on("mouse-move", lang.hitch(this, this.onShowInfo));
      this._routeLayer.on("mouse-out", lang.hitch(this, this.onHideInfo));
    },
    onShowInfo: function(event) {
      if (event.graphic) {
        var gra = event.graphic;
        if (
          gra.geometry.type === "point" &&
          gra.attributes &&
          gra.attributes.type &&
          gra.attributes.type === "RoutingPoint"
        ) {
          domStyle.set(this._tooltipDiv, "display", "block");
          this._tooltipDiv.innerHTML = gra.attributes.drive_instruction;
          var divWidth = this._tooltipDiv.clientWidth;
          var divHeight = this._tooltipDiv.clientHeight;

          var screenPoint = this.map.toScreen(event.graphic.geometry);

          domStyle.set(
            this._tooltipDiv,
            "left",
            screenPoint.x - divWidth / 2 + "px"
          );
          domStyle.set(
            this._tooltipDiv,
            "top",
            screenPoint.y - divHeight - 15 + "px"
          );
        }
      }
    },
    onHideInfo: function(event) {
      domStyle.set(this._tooltipDiv, "display", "none");
    },
    onTopicHandler_clearRouteSearch: function() {
      this._routeLayer.clear();
    },
    onTopicHandler_routeSearch: function(params) {
      this._routeLayer.clear();
      var routeParams = JSON.parse(params);
      var wayPoints = routeParams.wayPoints || "";
      var start = routeParams.startPoint;
      var end = routeParams.endPoint;
      this._bufferDistance = routeParams.bufferDistance || 0;

      this._wayPoints = [];
      var startStr = start.split(",");
      this._startPoint = new Point([Number(startStr[0]), Number(startStr[1])]);
      var endStr = end.split(",");
      this._endPoint = new Point([Number(endStr[0]), Number(endStr[1])]);
      if (wayPoints) {
        var ways = wayPoints.split(";");
        for (var i = 0; i < ways.length; i++) {
          var wayPoint = new Point(ways[i].split(","));
          this._wayPoints.push(wayPoint);
        }
      }
      this.OnQueryRouting(start, end, wayPoints);
    },

    OnQueryRouting: function(sPoint, ePoint, wPoints) {
      $.ajax({
        //用变量做url参数前面会带上http://localhost:8090, 不知如何解决
        url:
          this.config.url +
          "?ak=" +
          this.config.key +
          "&callback=callback&origin=" +
          sPoint +
          "&destination=" +
          ePoint +
          "&waypoints=" +
          wPoints,
        type: "GET",
        dataType: "jsonp", //使用jsonp避免跨域问题
        jsonpCallback: "callback",
        success: lang.hitch(this, function(result) {
          if (result.message === "ok") {
            var steps = result.result.routes[0].steps;
            var latlngs = [];
            this._routeGraphic = [];
            for (var i = 0; i < steps.length; i++) {
              var paths = steps[i].path.split(";");
              //turn:"3":左转;7,右转
              //var turn=steps[i].turn.toString()=="3"?"左转":"右转";
              //var road=steps[i].instruction;
              //var dir=steps[i].distance+"米";
              // var text=turn+"进入"+road+"沿着"+road+"行驶"+dir+"米";
              for (var j = 0; j < paths.length; j++) {
                var point = paths[j].split(",");
                var latlng = [Number(point[0]), Number(point[1])];
                latlngs.push(latlng);
              }
              var stepPoint = new Point([
                steps[i].stepOriginLocation.lng,
                steps[i].stepOriginLocation.lat
              ]);
              var stepGra = new Graphic(stepPoint, this._routePointsSymbol, {
                type: "RoutingPoint",
                instruction: steps[i].instruction,
                drive_instruction: steps[i].drive_instruction
              });
              this._routeGraphic.push(stepGra);
            }
            this._routeLine = new Polyline(latlngs);
            this._routeLineStart = new Point(latlngs[0]);
            this._routeLineEnd = new Point(latlngs[latlngs.length - 1]);
            this.OnRoutingResult();
          }
        }),
        error: {}
      });
    },
    OnRoutingResult: function() {
      var startGra = new Graphic(this._startPoint, this._startPointSymbol);
      var endGra = new Graphic(this._endPoint, this._endPointSymbol);
      var routeLine = new Graphic(this._routeLine, this._routeLineSymbol);

      var startLine = new Graphic(
        new Polyline([
          [this._startPoint.x, this._startPoint.y],
          [this._routeLineStart.x, this._routeLineStart.y]
        ]),
        this._LineSymbol
      );
      var endLine = new Graphic(
        new Polyline([
          [this._routeLineEnd.x, this._routeLineEnd.y],
          [this._endPoint.x, this._endPoint.y]
        ]),
        this._LineSymbol
      );

      this._routeLayer.add(routeLine);
      this._routeLayer.add(startLine);
      this._routeLayer.add(endLine);
      for (var j = 0; j < this._routeGraphic.length; j++) {
        this._routeLayer.add(this._routeGraphic[j]);
      }
      if (this._wayPoints) {
        for (var i = 0; i < this._wayPoints.length; i++) {
          var wayGra = new Graphic(this._wayPoints[i], this._wayPointsSymbol);
          this._routeLayer.add(wayGra);
        }
      }
      this._routeLayer.add(startGra);
      this._routeLayer.add(endGra);
    }
  });
});
