define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "jimu/BaseWidget",
  "esri/graphic",
  "esri/geometry/Point",
  "esri/geometry/Polyline",
  "esri/geometry/webMercatorUtils",
  "esri/layers/GraphicsLayer",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/jsonUtils",
  "esri/Color",
  "esri/SpatialReference",
  "esri/geometry/geometryEngine",
  "esri/tasks/GeometryService",
  "jimu/utils",
  "esri/InfoTemplate"
], function(
  declare,
  lang,
  array,
  topic,
  BaseWidget,
  Graphic,
  Point,
  Polyline,
  webMercatorUtils,
  GraphicsLayer,
  PictureMarkerSymbol,
  SimpleLineSymbol,
  SimpleMarkerSymbol,
  SimpleFillSymbol,
  symbolJsonUtils,
  Color,
  SpatialReference,
  GeometryEngine,
  GeometryService,
  jimuUtil,
  InfoTemplate
) {
  return declare([BaseWidget], {
    exceptionPointLayer: null,
    trackPointLayer: null,
    trackLineLayer: null,

    movingPointSymbol: null,

    trackPointSymbol: null,
    crossPointSymbol: null,
    backPointSymbol: null,

    highlightPointSymbol1: null,
    highlightPointSymbol2: null,
    highlightPointSymbol3: null,

    startPointSymbol: null,
    exceptionPointSymbol: null,

    trackLineSymbol: null,
    crossLineSymbol: null,
    bufferUnit: GeometryService.UNIT_METER,

    postCreate: function() {
      this.inherited(arguments);

      this.trackLineLayer = new GraphicsLayer();
      this.map.addLayer(this.trackLineLayer);

      this.trackPointLayer = new GraphicsLayer();
      this.map.addLayer(this.trackPointLayer);

      this.exceptionPointLayer = new GraphicsLayer();
      this.map.addLayer(this.exceptionPointLayer);

      this.trackLineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([17, 236, 251, 1]),
        8
      );
      this.crossLineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([255, 0, 0, 1]),
        8
      );

      //卡口点位
      this.trackPointSymbol = new PictureMarkerSymbol(
        window.path + "images/mapIcons/wlmq/icon_kk.png",
        30,
        40
      );
      this.trackPointSymbol.yoffset = 20;
      this.crossPointSymbol = new PictureMarkerSymbol(
        window.path + "images/mapIcons/wlmq/icon_kk_hover.png",
        30,
        40
      );
      this.crossPointSymbol.yoffset = 20;

      this.backPointSymbol = new PictureMarkerSymbol(
        window.path + "images/mapIcons/point_red.png",
        100,
        100
      );
      //异常停留点位高亮
      this.highlightPointSymbol1 = new SimpleMarkerSymbol(
        SimpleMarkerSymbol.STYLE_CIRCLE,
        10,
        new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("red"), 0),
        new Color("red")
      );
      //异常停留点位高亮
      this.highlightPointSymbol2 = new SimpleMarkerSymbol(
        SimpleMarkerSymbol.STYLE_CIRCLE,
        40,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color([255, 0, 0, 0]),
          0
        ),
        new Color([255, 0, 0, 0.7])
      );
      //异常停留点位高亮
      this.highlightPointSymbol3 = new SimpleMarkerSymbol(
        SimpleMarkerSymbol.STYLE_CIRCLE,
        60,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color([255, 0, 0, 0]),
          0
        ),
        new Color([255, 0, 0, 0.5])
      );
      //开始车辆点位
      this.startPointSymbol = new PictureMarkerSymbol(
        window.path + "images/mapIcons/wlmq/icon_qgc.png",
        48,
        23
      );
      this.startPointSymbol.xoffset = -30;
      //车辆异常停留点位
      this.exceptionPointSymbol = new PictureMarkerSymbol(
        window.path + "images/mapIcons/wlmq/icon_qgc.png",
        48,
        23
      );

      topic.subscribe(
        "trackException",
        lang.hitch(this, this.onTopicHandler_startTrackPlayback)
      );
      topic.subscribe(
        "cleartrackException",
        lang.hitch(this, this.onTopicHandler_cleartrackException)
      );
    },

    _clearData: function() {
      this.trackPointLayer.clear();
      this.trackLineLayer.clear();
      this.exceptionPointLayer.clear();
      topic.publish("clearToolTip");
    },

    onTopicHandler_startTrackPlayback: function(params) {
      var trackParams = JSON.parse(params);
      var id = trackParams.id;
      var kkPoints = trackParams.kkPoints;
      var trackPoints = trackParams.trackPoints;
      var exceptionPoints = trackParams.exception;
      //var exceptionDistance = trackParams.distance || 1000;

      var paths = [];
      array.forEach(
        trackPoints,
        function(trackPoint) {
          paths.push([trackPoint.x, trackPoint.y]);
          if (paths.length == 1) {
            var point = new Point(trackPoint.x, trackPoint.y);
            var graphic = new Graphic(point, this.startPointSymbol, {});
            if (id) {
              graphic.pid = id;
              graphic.type = "exceptionstart";
            }
            this.trackPointLayer.add(graphic);
          }
        },
        this
      );
      var line = new Polyline();
      line.addPath(paths);
      var LineGraphic = new Graphic(line, this.trackLineSymbol);
      if (id) {
        LineGraphic.pid = id;
        LineGraphic.type = "exceptionline";
      }
      this.trackLineLayer.add(LineGraphic);
      if (this.map.spatialReference.isWebMercator()) {
        line = webMercatorUtils.geographicToWebMercator(line);
      }
      //异常停留车辆
      var bufferPolygon;
      array.forEach(
        exceptionPoints,
        function(exceptionPoint) {
          var startPoint = new Point(
            exceptionPoint.startPoint.x,
            exceptionPoint.startPoint.y
          );
          var endPoint = new Point(
            exceptionPoint.endPoint.x,
            exceptionPoint.endPoint.y
          );
          var seLine = new Polyline();
          seLine.addPath([startPoint, endPoint]);

          if (this.map.spatialReference.isWebMercator()) {
            seLine = webMercatorUtils.geographicToWebMercator(seLine);
          }

          var crossLines = this._doIntersectPoint(startPoint, line, seLine);

          //var t1 = new Graphic(crossLines[0], this.crossLineSymbol);
          // var t2 = new Graphic(crossLines[1], this.crossLineSymbol);
          //this.exceptionPointLayer.add(t1);
          //this.exceptionPointLayer.add(t2);

          var crossLines2;
          var crossline;
          if (crossLines.length > 0) {
            if (startPoint.x < endPoint.x) {
              crossLines2 = this._doIntersectPoint(
                endPoint,
                crossLines[crossLines.length - 1],
                seLine
              );
              crossline = crossLines2[0];
            } else {
              crossLines2 = this._doIntersectPoint(
                endPoint,
                crossLines[0],
                seLine
              );
              crossline = crossLines2[crossLines2.length - 1];
            }
          } else {
            console.log("00");
            crossline = new Polyline();
            crossline.addPath([startPoint, endPoint]);
          }
          if (crossline) {
            if (crossline.paths.length > 1) {
              for (var i = 0; i < crossline.paths.length; i++) {
                var pline = new Polyline(
                  new SpatialReference({ wkid: 102100 })
                );
                pline.addPath(crossline.paths[i]);
                if (GeometryEngine.intersects(pline, seLine)) {
                  crossline = pline;
                  break;
                }
              }
            }
          } else {
            crossline = new Polyline();
            crossline.addPath([startPoint, endPoint]);
          }

          var point = this.getLineCenter(crossline);
          var crossGraphic = new Graphic(crossline, this.crossLineSymbol);

          var graphic1 = new Graphic(
            point,
            this.backPointSymbol,
            exceptionPoint.field || {}
          );

          var cargraphic = new Graphic(
            point,
            this.exceptionPointSymbol,
            exceptionPoint.field || {}
          );

          topic.publish("showToolTip", {
            graphic: cargraphic,
            context: "<div class='exceptDiv'>异常停留</div>",
            id: id,
            offset: 20
          });
          if (this.map.spatialReference.isWebMercator()) {
            //point = webMercatorUtils.geographicToWebMercator(point);
          }
          //bufferPolygon = this._doBuffer(point, exceptionDistance);
          /*   this.exceptionPointLayer.add(
            new Graphic(startPoint, this.highlightPointSymbol3)
          );
          this.exceptionPointLayer.add(
            new Graphic(endPoint, this.highlightPointSymbol3)
          );*/

          if (id) {
            crossGraphic.pid = id;
            graphic1.pid = id;
            cargraphic.pid = id;
          }
          if (exceptionPoint.id) {
            cargraphic.id = exceptionPoint.id;
          }
          cargraphic.type = "car";
          this.exceptionPointLayer.add(graphic1);

          this.exceptionPointLayer.add(crossGraphic);
          this.exceptionPointLayer.add(cargraphic);
        },
        this
      );

      array.forEach(
        kkPoints,
        function(kkPoint) {
          var point = new Point(kkPoint.x, kkPoint.y);
          var symbol = this.trackPointSymbol;
          // if (bufferPolygon && bufferPolygon.contains(point)) {
          //   symbol = this.crossPointSymbol;
          // }

          var graphic = new Graphic(point, symbol, kkPoint.fields);
          if (id) {
            graphic.pid = id;
          }
          graphic.type = "kk";
          if (kkPoint.id) {
            graphic.id = kkPoint.id;
          }
          this.trackPointLayer.add(graphic);
        },
        this
      );
    },
    _doBuffer: function(geometry, bufferDistance) {
      var bufferPolygon =
        this.map.spatialReference.wkid === 4326
          ? GeometryEngine.geodesicBuffer(
              geometry,
              bufferDistance,
              this.bufferUnit
            )
          : GeometryEngine.buffer(geometry, bufferDistance, this.bufferUnit);

      return bufferPolygon;
    },
    _doIntersectPoint: function(p1, line, seLine) {
      var line1 = this._doLine(p1);
      if (this.map.spatialReference.isWebMercator()) {
        line1 = webMercatorUtils.geographicToWebMercator(line1);
      }
      //var graphic1 = new Graphic(line, this.crossLineSymbol);
      // this.exceptionPointLayer.add(graphic1);

      //var graphic2 = new Graphic(line1, this.crossLineSymbol);
      //this.exceptionPointLayer.add(graphic2);

      var cutLine = line;
      if (line.paths.length > 1) {
        for (var i = 0; i < line.paths.length; i++) {
          var pline = new Polyline(new SpatialReference({ wkid: 102100 }));
          pline.addPath(line.paths[i]);
          if (GeometryEngine.intersects(pline, seLine)) {
            cutLine = pline;
            break;
          }
        }
      }

      var crossLines = GeometryEngine.cut(cutLine, line1);

      return crossLines;
    },
    getLineCenter: function(line) {
      if (line.spatialReference.isWebMercator()) {
        line = webMercatorUtils.webMercatorToGeographic(line);
      }
      if (line.paths[0].length == 2) {
        var sp = line.paths[0][0];
        var ep = line.paths[0][1];
        var p = new Point((sp[0] + ep[0]) / 2, (sp[1] + ep[1]) / 2);
        return p;
      } else {
        var path = line.paths[0];
        var pointCount = path.length;
        return line.getPoint(0, Math.floor(pointCount / 2));
      }
    },
    _doLine: function(point) {
      var len = 0.003;
      var line = new Polyline();
      var p1 = [point.x, point.y - len];
      var p2 = [point.x, point.y + len];
      line.addPath([p1, p2]);
      return line;
    },
    onTopicHandler_cleartrackException: function(params) {
      var ids = params || [];

      var layerArr = [
        this.trackPointLayer,
        this.trackLineLayer,
        this.exceptionPointLayer
      ];

      if (ids.length > 0) {
        array.forEach(
          layerArr,
          function(layer) {
            for (var i = 0; i < layer.graphics.length; i++) {
              var graphic = layer.graphics[i];
              if (graphic.pid && ids.indexOf(graphic.pid) > -1) {
                layer.remove(graphic);
                i--;
              }
            }
          },
          this
        );
        topic.publish("clearToolTip", ids);
      } else {
        this._clearData();
      }
    }
  });
});
