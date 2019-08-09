define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/Deferred",
  "dojo/topic",
  "dojo/promise/all",
  "jimu/BaseWidget",
  "jimu/utils",
  "esri/layers/GraphicsLayer",
  "esri/geometry/Point",
  "esri/geometry/Polyline",
  "esri/geometry/Polygon",
  "esri/geometry/Multipoint",
  "esri/geometry/geometryEngine",
  "esri/geometry/geometryEngineAsync",
  "esri/graphic",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/Color",
  "esri/tasks/RouteTask",
  "esri/tasks/RouteParameters",
  "esri/tasks/FeatureSet",
  "esri/SpatialReference",
  "esri/units",
  "esri/geometry/webMercatorUtils",
  "esri/tasks/GeometryService",
  "esri/tasks/IdentifyTask",
  "esri/tasks/IdentifyParameters",
  "esri/tasks/query",
  "esri/tasks/QueryTask"
], function(
  declare,
  lang,
  array,
  Deferred,
  topic,
  all,
  BaseWidget,
  jimuUtils,
  GraphicsLayer,
  Point,
  Polyline,
  Polygon,
  Multipoint,
  GeometryEngine,
  GeometryEngineAsync,
  Graphic,
  PictureMarkerSymbol,
  SimpleLineSymbol,
  SimpleMarkerSymbol,
  SimpleFillSymbol,
  Color,
  RouteTask,
  RouteParameters,
  FeatureSet,
  SpatialReference,
  Units,
  WebMercatorUtils,
  GeometryService,
  IdentifyTask,
  IdentifyParameters,
  Query,
  QueryTask
) {
  var clazz = declare([BaseWidget], {
    name: "RouteByRoad",
    resultLayer: null,
    defaultPolylineSymbol: null,
    highlightPolylineSymbol: null,
    roadLayerUrl: null,
    routeLayerUrl: null,
    queryUrl: null,
    hightlightLayer: null,
    //距离. 距离越小,位置越精确
    stepLength: 0.0001,

    movingPointLayer: null,
    movingPointSymbol: null,

    trackPointLayer: null,
    trackPointSymbol: null,
    highlightPointSymbol: null,
    inPointSymbol: null,
    outPointSymbol: null,

    trackLineLayer: null,
    trackLineSymbol: null,
    inTrackLineSymbol: null,
    sameLineSymbol: null,

    trackPoints: [],
    movingPointGraphic: null,
    movingFunctions: [],
    //是否循环播放
    loop: null,
    //是否中点定位.
    _center: false,
    //是否层级变化.
    _zoom: false,

    repeatCount: 0,
    currentCount: 0,
    _monitorArea: null,

    kkPointLayer: null,
    kkPointSymbol: null,
    _colors: [
      [255, 0, 0, 0.6],
      [255, 165, 0, 0.5],
      [255, 225, 0, 0.4],
      [0, 255, 0, 0.3]
    ],
    bufferUnit: GeometryService.UNIT_METER,
    postCreate: function() {
      this.roadLayerUrl = this.config.roadUrl.replace(
        /{gisServer}/i,
        this.appConfig.gisServer
      );
      this.routeLayerUrl = this.config.routeUrl.replace(
        /{gisServer}/i,
        this.appConfig.gisServer
      );
      this.queryUrl = this.config.queryUrl.replace(
        /{gisServer}/i,
        this.appConfig.gisServer
      );
      this.resultLayer = new GraphicsLayer();
      this.map.addLayer(this.resultLayer);

      this.hightlightLayer = new GraphicsLayer();
      this.map.addLayer(this.hightlightLayer);

      this.trackLineLayer = new GraphicsLayer();
      this.map.addLayer(this.trackLineLayer);

      this.defaultPolylineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([0, 255, 0, 255]),
        4
      );

      this.highlightPolylineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([255, 255, 0, 255]),
        8
      );

      this.trackLineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([33, 176, 75, 255]),
        5
      );
      this.inTrackLineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([255, 0, 0, 255]),
        5
      );
      this.sameLineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([0, 255, 0, 0.5]),
        3
      );

      this.trackPointSymbol = new SimpleMarkerSymbol(
        SimpleMarkerSymbol.STYLE_CIRCLE,
        12,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color("white"),
          1
        ),
        new Color("#53c7d4")
      );

      this.highlightPointSymbol = new SimpleMarkerSymbol(
        SimpleMarkerSymbol.STYLE_CIRCLE,
        18,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color("white"),
          2
        ),
        new Color("red")
      );
      //卡口点位
      this.kkPointSymbol = new PictureMarkerSymbol(
        window.path + "images/mapIcons/wlmq/img_kk.png",
        18,
        22
      );
      this.kkPointSymbol.yoffset = 11;

      this.trackPointLayer = new GraphicsLayer();
      this.map.addLayer(this.trackPointLayer);

      this.kkPointLayer = new GraphicsLayer();
      this.map.addLayer(this.kkPointLayer);

      this.movingPointLayer = new GraphicsLayer();
      this.map.addLayer(this.movingPointLayer);
      if (this.movingPointSymbol === null) {
        this.movingPointSymbol = new PictureMarkerSymbol(
          window.path + "images/mapIcons/icon_car_blue.png",
          17,
          23
        );
      }

      topic.subscribe(
        "RouteByRoadSearch",
        lang.hitch(this, this.onTopicHandler_RouteByRoadSearch)
      );
      topic.subscribe(
        "clearRouteByRoadSearch",
        lang.hitch(this, this.onTopicHandler_clearRouteByRoadSearch)
      );
    },
    onTopicHandler_clearRouteByRoadSearch: function(params) {
      this._clearData(params);
    },
    _clearData: function(params) {
      if (params === undefined || params === "" || params === null) {
        if (this.movingFunctions.length > 0) {
          array.forEach(this.movingFunctions, function(movingFunction) {
            clearInterval(movingFunction.interval);
          });
        }
        topic.publish("clearToolTip");
        this.resultLayer.clear();
        this.kkPointLayer.clear();
        this.trackPointLayer.clear();
        this.trackLineLayer.clear();
        this.movingPointLayer.clear();
        this.hightlightLayer.clear();
      } else {
        if (this.movingFunctions.length > 0) {
          array.forEach(this.movingFunctions, function(movingFunction) {
            if (params.indexOf(movingFunction.id) > -1) {
              clearInterval(movingFunction.interval);
            }
          });
        }
        this.clearGraphic(
          [
            this.resultLayer,
            this.kkPointLayer,
            this.trackPointLayer,
            this.trackLineLayer,
            this.movingPointLayer,
            this.hightlightLayer
          ],
          params
        );
      }
    },
    clearGraphic: function(layers, ids) {
      array.forEach(layers, function(layer) {
        for (var i = 0; i < layer.graphics.length; i++) {
          var graphic = layer.graphics[i];
          if (graphic.id && ids.indexOf(graphic.id) > -1) {
            layer.remove(graphic);
            i--;
          }
        }
      });
    },
    /**检查轨迹点数据, 去掉重复数据,并求出每个点的buffer值*/
    checkTrackPoints: function(trackPoints) {
      for (var i = 0; i < trackPoints.length; i++) {
        trackPoints[i].buffer = this._doBuffer(
          new Point([trackPoints[i].x, trackPoints[i].y]),
          10
        );
        if (i > 0) {
          if (
            trackPoints[i - 1].x === trackPoints[i].x &&
            trackPoints[i - 1].y === trackPoints[i].y
          ) {
            trackPoints.splice(i, 1);
            i--;
          }
        }
      }
      return trackPoints;
    },
    onTopicHandler_RouteByRoadSearch: function(params) {
      params = JSON.parse(params);
      var autoStart = params.autoStart !== false;
      var loop = params.loop !== false;

      var repeatCount = params.repeatCount || 0;

      this._center = params.isCenter === true;
      this._zoom = params.isZoom === true;

      var carSymbol = params.symbol;
      if (carSymbol) {
        var movingPointSymbol = this._getEsriPointSymbol(carSymbol);
      }
      var id = params.id || undefined;

      var trackPoints = this.checkTrackPoints(params.trackPoints);
      var monitors = params.monitors;
      var monitorAreas = this._showMonitor(monitors, id);
      var stops = params.stops || undefined;
      //显示轨迹点
      this._showTrackRoute(
        trackPoints,
        carSymbol,
        id,
        repeatCount,
        loop,
        monitorAreas,
        stops
      );
    },
    _showTrackRoute: function(
      trackPoints,
      symbol,
      id,
      repeatCount,
      loop,
      monitorAreas,
      stops
    ) {
      var trackFeatures = [];
      array.forEach(
        trackPoints,
        function(trackPoint) {
          var point = new Point(trackPoint.x, trackPoint.y);
          if (this.map.spatialReference.isWebMercator()) {
            point = WebMercatorUtils.geographicToWebMercator(point);
          }
          var graphic = new Graphic(point);
          graphic.id = id;
          graphic.symbol =
            trackPoint.isHighlight === true
              ? this.highlightPointSymbol
              : this.trackPointSymbol;
          graphic.attributes = trackPoint.fields;

          trackFeatures.push(graphic);

          //this.trackPointLayer.add(graphic);
          if (trackPoint.isHighlight === true && graphic.getNode()) {
            graphic.getNode().setAttribute("data-enlarge", "highlight");
          }
        },
        this
      );

      var routeTask = new RouteTask(this.routeLayerUrl);
      var routeParams = new RouteParameters();
      var featureSet = new FeatureSet();
      featureSet.features = trackFeatures;

      routeParams.stops = featureSet;
      routeParams.returnRoutes = true;
      routeParams.returnDirections = true;
      routeParams.directionsLengthUnits = Units.MILES;
      routeParams.outSpatialReference = new SpatialReference({ wkid: 4326 });
      routeTask.solve(
        routeParams,
        lang.hitch(this, function showRoute(evt) {
          var routeResults = evt.routeResults;
          if (routeResults.length > 0) {
            var paths = routeResults[0].route.geometry.paths;
            var polyline = new Polyline(paths);

            var routePoints = [];
            for (var i = 0; i < paths.length; i++) {
              for (var j = 0; j < paths[i].length; j++) {
                routePoints.push({ x: paths[i][j][0], y: paths[i][j][1] });
              }
            }

            var movingPointGraphic = new Graphic(
              new Point(routePoints[0].x, routePoints[0].y),
              this.movingPointSymbol
            );
            movingPointGraphic.visible = false;

            var monitorCenter;
            var inMonitor = false;
            if (monitorAreas.length > 0) {
              if (
                monitorAreas[0].contains(
                  new Point([routePoints[0].x, routePoints[0].y])
                )
              ) {
                inMonitor = true;
              }
              monitorCenter = monitorAreas[
                monitorAreas.length - 1
              ].getCentroid();
            }
            var data = {
              id: id,
              movingPointGraphic: movingPointGraphic,
              //CarPointGraphic: carGraphic,
              trackPoints: routePoints,
              kkPoints: trackPoints,
              loop: loop,
              repeatCount: repeatCount,
              currentCount: 0,
              inTrackPath: [],
              outTrackPath: [],
              inMonitor: inMonitor,
              monitors: monitorAreas,
              center: monitorCenter,
              stops: stops
            };
            if (inMonitor) {
              data.inTrackPath.push([[routePoints[0].x, routePoints[0].y]]);
            } else {
              data.outTrackPath.push([[routePoints[0].x, routePoints[0].y]]);
            }
            this.map.centerAndZoom([routePoints[0].x, routePoints[0].y], 7);
            var routeids = [];
            this._queryRouteId(polyline).then(
              lang.hitch(this, function(result) {
                var features = result.features;
                array.forEach(features, function(graphic) {
                  routeids.push(graphic.attributes.FEATUREID);
                });
                data.routeids = routeids;
                this._movePoint(0, 1, data);
              })
            );
          }
        }),
        function error(evt) {
          console.log(evt);
        }
      );
    },
    _showTrackLine: function(trackPoints, id) {
      var path = array.map(trackPoints, function(trackPoint) {
        return [trackPoint.x, trackPoint.y];
      });
      var line = new Polyline([path]);
      var lineGraphic = new Graphic(line);
      lineGraphic.id = id;
      lineGraphic.symbol = this.trackLineSymbol;
      this.trackLineLayer.add(lineGraphic);
    },
    _showMonitor: function(monitors, id) {
      var areas = [];
      for (var i = monitors.length - 1; i > -1; i--) {
        var kkPoints = monitors[i].kkpoints;
        var level = monitors[i].level;
        var rings = array.map(
          kkPoints,
          lang.hitch(this, function(kkPoint) {
            var point = new Point([kkPoint.x, kkPoint.y]);
            var kkgraphic = new Graphic(
              point,
              this.kkPointSymbol,
              kkPoint.field || {}
            );
            kkgraphic.id = id;
            this.kkPointLayer.add(kkgraphic);

            return [kkPoint.x, kkPoint.y];
          })
        );
        var area = new Polygon([rings]);
        areas.push(area);
        var areaGraphic = new Graphic(area);
        areaGraphic.symbol = new SimpleFillSymbol(
          SimpleFillSymbol.STYLE_SOLID,
          new SimpleLineSymbol(
            SimpleLineSymbol.STYLE_SOLID,
            new Color(this._colors[level - 1]),
            1
          ),
          new Color(this._colors[level - 1])
        );
        areaGraphic.id = id;
        this.resultLayer.add(areaGraphic);
      }

      return areas;
    },
    /**播放移动动画*/
    _movePoint: function(startIndex, endIndex, obj) {
      //卡口坐标,判断当前轨迹点是否在某卡口位置.
      if (startIndex == 0 && endIndex == 1) {
        if (obj.repeatCount > 0 && obj.currentCount >= obj.repeatCount) {
          this._clearData([obj.id]);
          return;
        }
        obj.currentCount++;
      }
      var x1 = obj.trackPoints[startIndex].x;
      var y1 = obj.trackPoints[startIndex].y;
      var x2 = obj.trackPoints[endIndex].x;
      var y2 = obj.trackPoints[endIndex].y;

      this._currentPointInfo(new Point([x1, y1]), obj);

      this._doCenter(x1, y1, x2, y2);

      var distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

      //如果两点距离小于步进, 直接移动到下一个点
      if (distance <= this.stepLength * 2) {
        obj.movingPointGraphic.geometry.x = x2;
        obj.movingPointGraphic.geometry.y = y2;

        this._movingStep(obj.movingPointGraphic.geometry, obj);

        startIndex++;
        endIndex++;

        if (endIndex == obj.trackPoints.length) {
          this._currentPointInfo(obj.movingPointGraphic.geometry, obj);
        }

        if (endIndex < obj.trackPoints.length) {
          this._movePoint(startIndex, endIndex, obj);
        } else if (obj.loop) {
          this._moveReset(obj);
        }
      } else {
        //斜率
        var p = (y2 - y1) / (x2 - x1);
        // console.log("p: " + p);
        var movingFunction = setInterval(
          lang.hitch(this, function() {
            // this.startIndex = startIndex;
            // this.endIndex = endIndex;

            if (Math.abs(p) === Number.POSITIVE_INFINITY) {
              obj.movingPointGraphic.geometry.y += this.stepLength;
            } else {
              if (x2 < x1) {
                obj.movingPointGraphic.geometry.x -=
                  (1 / Math.sqrt(1 + p * p)) * this.stepLength;
              } else {
                obj.movingPointGraphic.geometry.x +=
                  (1 / Math.sqrt(1 + p * p)) * this.stepLength;
              }

              if (y2 < y1) {
                obj.movingPointGraphic.geometry.y -=
                  (Math.abs(p) / Math.sqrt(1 + p * p)) * this.stepLength;
              } else {
                obj.movingPointGraphic.geometry.y +=
                  (Math.abs(p) / Math.sqrt(1 + p * p)) * this.stepLength;
              }

              obj.movingPointGraphic.symbol.angle = this._calculateAngle(
                x1,
                y1,
                x2,
                y2
              );
            }
            var point = obj.movingPointGraphic.geometry;
            //this._queryRouteId(point).then(function(evt) {
            //  console.log(evt);
            //});

            this._movingStep(point, obj);

            if (
              Math.sqrt(
                Math.pow(x2 - obj.movingPointGraphic.geometry.x, 2) +
                  Math.pow(y2 - obj.movingPointGraphic.geometry.y, 2)
              ) < this.stepLength
            ) {
              clearInterval(movingFunction);
              startIndex++;
              endIndex++;
              if (endIndex == obj.trackPoints.length) {
                this._currentPointInfo(obj.movingPointGraphic.geometry, obj);
              }
              if (endIndex < obj.trackPoints.length) {
                this._movePoint(startIndex, endIndex, obj);
              } else if (obj.loop) {
                this._moveReset(obj);
              }
            }
          }),
          35
        );
        this.movingFunctions.push({ id: obj.id, interval: movingFunction });
      }
    },
    _moveReset: function(obj) {
      obj.movingPointGraphic.geometry.x = obj.trackPoints[0].x;
      obj.movingPointGraphic.geometry.y = obj.trackPoints[0].y;
      obj.outTrackPath = [];
      obj.inTrackPath = [];
      obj.hasStop = undefined;
      this.trackLineLayer.remove(obj.outLineGraphic);
      this.trackLineLayer.remove(obj.inLineGraphic);
      this.clearGraphic([this.trackPointLayer, this.hightlightLayer], [obj.id]);
      this._movePoint(0, 1, obj);
    },
    _queryRouteId: function(line) {
      var def = new Deferred();

      var queryTask = new QueryTask(this.queryUrl);
      var query = new Query();
      query.outFields = ["*"];
      query.returnGeometry = true;
      query.outSpatialReference = new SpatialReference({ wkid: 4326 });
      query.geometry = line;
      query.spatialRelationship = Query.SPATIAL_REL_OVERLAPS;
      queryTask.execute(
        query,
        lang.hitch(this, function(featureSet) {
          def.resolve(featureSet);
        }),
        function(err) {
          def.reject(err);
        }
      );
      return def;
    },
    _calculateAngle: function(x1, y1, x2, y2) {
      if (x2 - x1 == 0) {
        if (y2 - y1 > 0) {
          return 0;
        } else {
          return 180;
        }
      }
      if (y2 - y1 == 0) {
        if (x2 - x1 > 0) {
          return 90;
        } else {
          return 270;
        }
      }
      var tan =
        (Math.atan(Math.abs((y2 - y1) / (x2 - x1))) * 180) / Math.PI + 90;
      //第一象限
      if (x2 > x1 && y2 > y1) {
        return -tan + 180;
      }
      //第二象限
      else if (x2 > x1 && y2 < y1) {
        return tan;
      }
      //第三象限
      else if (x2 < x1 && y2 > y1) {
        return tan - 180;
      }
      //第四象限
      else {
        return -tan;
      }
    },
    _doCenter: function(x, y, x2, y2) {
      var point = new Point([x, y]);
      var point2 = new Point([x2, y2]);
      if (this._zoom) {
        var line = new Polyline();
        line.addPath([point, point2]);
        this.map.setExtent(line.getExtent().expand(4));
      } else {
        if (this._center) {
          if (this.map.spatialReference.isWebMercator()) {
            point2 = WebMercatorUtils.geographicToWebMercator(point2);
          }
          this.map.centerAt(point2);
        }
      }
    },
    _movingStep: function(point, obj) {
      //this.movingPointLayer.remove(obj.movingPointGraphic);
      //this.movingPointLayer.add(obj.movingPointGraphic);
      var monitors = obj.monitors;
      var trackPoints = obj.kkPoints;
      var inKKBuffer = false;
      for (var i = 0; i < trackPoints.length; i++) {
        var kkpoint = new Point([trackPoints[i].x, trackPoints[i].y]);
        if (trackPoints[i].buffer.contains(point)) {
          obj.inKKBuffer = true;
          inKKBuffer = true;
        }
      }

      if (monitors.length > 0) {
        if (monitors[0].contains(point)) {
          if (
            obj.stops &&
            (obj.hasStop === undefined || obj.hasStop === false)
          ) {
            obj.hasStop = true;
            this._getOtherRoad(point, obj);
          }
          if (obj.inMonitor && obj.inKKBuffer) {
            obj.inTrackPath[obj.inTrackPath.length - 1].push([
              point.x,
              point.y
            ]);
          } else {
            var paths;
            if (obj.outTrackPath.length > 0) {
              var lastOutPaths = obj.outTrackPath[obj.outTrackPath.length - 1];
              paths = [
                lastOutPaths[lastOutPaths.length - 1],
                [point.x, point.y]
              ];
            } else {
              paths = [[point.x, point.y]];
            }
            obj.inTrackPath.push(paths);
          }
          obj.inMonitor = true;
        } else {
          if (obj.inMonitor && inKKBuffer) {
            var paths;
            if (obj.inTrackPath.length > 0) {
              var lastInPaths = obj.inTrackPath[obj.inTrackPath.length - 1];
              paths = [lastInPaths[lastInPaths.length - 1], [point.x, point.y]];
            } else {
              paths = [[point.x, point.y]];
            }
            obj.outTrackPath.push(paths);
          } else {
            obj.outTrackPath[obj.outTrackPath.length - 1].push([
              point.x,
              point.y
            ]);
          }
          obj.inMonitor = false;
        }
      }
      if (obj.outTrackPath.length > 0) {
        if (inKKBuffer || obj.inMonitor) {
          this.trackLineLayer.remove(obj.outLineGraphic);
          var outline = new Polyline(obj.outTrackPath);
          var outLineGraphic = new Graphic(outline, this.trackLineSymbol);
          outLineGraphic.id = obj.id;
          obj.outLineGraphic = outLineGraphic;

          this.trackLineLayer.add(outLineGraphic);
        }
      }
      if (obj.inTrackPath.length > 0) {
        if (inKKBuffer) {
          this.trackLineLayer.remove(obj.inLineGraphic);
          var inline = new Polyline(obj.inTrackPath);
          var inLineGraphic = new Graphic(inline, this.inTrackLineSymbol);
          inLineGraphic.id = obj.id;
          obj.inLineGraphic = inLineGraphic;

          this.trackLineLayer.add(inLineGraphic);
        }
      }
    },
    _currentPointInfo: function(point, obj) {
      //突破围栏之后进行
      var trackPoints = obj.kkPoints;
      if (trackPoints && trackPoints.length > 0) {
        for (var i = 0; i < trackPoints.length; i++) {
          var kkpoint = new Point([trackPoints[i].x, trackPoints[i].y]);

          var fields = trackPoints[i].fields || {};
          var id = trackPoints[i].id;

          var roadids = trackPoints[i].roadids;
          var kkBuffer;
          if (trackPoints[i].buffer) {
            kkBuffer = trackPoints[i].buffer;
          } else {
            kkBuffer = this._doBuffer(kkpoint, 50);
          }
          var kkinfo = null;

          if (kkBuffer.contains(point)) {
            if (obj.info === undefined || obj.info.id != id) {
              var bufferGraphic = new Graphic(
                kkpoint,
                this.kkPointSymbol,
                fields
              );
              bufferGraphic.id = obj.id;
              this.trackPointLayer.add(bufferGraphic);

              if (obj.carGraphic) {
                this.movingPointLayer.remove(obj.carGraphic);
              }
              var carGraphic = new Graphic(kkpoint, this.movingPointSymbol);
              carGraphic.id = obj.id;
              obj.carGraphic = carGraphic;
              this.movingPointLayer.add(carGraphic);

              var data = {};
              for (var str in fields) {
                data[str] = fields[str];
              }
              data.id = id || "";
              obj.info = data;
              //

              this._queryCarInRoad(kkBuffer).then(function(roadids) {
                var ids = [];

                array.forEach(roadids, function(rid) {
                  if (obj.routeids.indexOf(rid) > -1) {
                    ids.push(rid);
                  }
                });
                data.roadid = ids;
                if (
                  typeof showRouteInfo !== "undefined" &&
                  showRouteInfo instanceof Function
                ) {
                  showRouteInfo(data);
                }
              });

              //this._getRoadBranch(trackPoints[i], obj.id);
            }
          }
        }
      }
    },
    _getRoadBranch: function(kkPoint, id) {
      this.clearGraphic([this.hightlightLayer], [id]);
      var str = "";
      var roadids = kkPoint.roadids;
      array.forEach(roadids, function(roadid) {
        str = str + "'" + roadid + "',";
      });
      str = str.substr(0, str.length - 1);
      var queryTask = new QueryTask(this.queryUrl);
      var query = new Query();
      query.outFields = ["*"];
      query.returnGeometry = true;
      query.where = "FEATUREID  in (" + str + ")";
      query.outSpatialReference = new SpatialReference({ wkid: 4326 });
      queryTask.execute(
        query,
        lang.hitch(this, function(featureSet) {
          if (featureSet.features.length > 0) {
            for (var i = 0; i < featureSet.features.length; i++) {
              var graphic = new Graphic(
                featureSet.features[i].geometry,
                this.highlightPolylineSymbol,
                featureSet.features[i].attributes
              );
              graphic.id = id;
              this.hightlightLayer.add(graphic);
            }
          }
        })
      );
    },
    _queryCarInRoad: function(buffer) {
      var def = new Deferred();
      var queryTask = new QueryTask(this.queryUrl);
      var query = new Query();
      query.outFields = ["*"];
      query.returnGeometry = true;
      query.outSpatialReference = new SpatialReference({ wkid: 4326 });
      query.geometry = buffer;
      query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
      queryTask.execute(
        query,
        lang.hitch(this, function(featureSet) {
          var routeids = [];
          array.forEach(featureSet.features, function(feature) {
            routeids.push(feature.attributes.FEATUREID);
          });
          def.resolve(routeids);
        }),
        function(err) {
          def.reject(err);
        }
      );
      return def;
    },
    _getOtherRoad(point, obj) {
      if (obj.carGraphic) {
        this.movingPointLayer.remove(obj.carGraphic);
      }
      var carGraphic = new Graphic(point, this.movingPointSymbol);
      carGraphic.id = obj.id;
      obj.carGraphic = carGraphic;
      this.movingPointLayer.add(carGraphic);

      var stops = obj.stops;
      var center = obj.center;
      var defArr = [];
      for (var i = 0; i < obj.stops.length; i++) {
        var stop = obj.stops[i].stop;
        this._queryOtherRoad(point, center, stop, obj.id);
      }
      this._queryOtherRoad(point, center, obj.trackPoints, obj.id);
    },
    _queryOtherRoad: function(start, end, points, id) {
      var def = new Deferred();
      var trackFeatures = [];
      if (this.map.spatialReference.isWebMercator()) {
        start = WebMercatorUtils.geographicToWebMercator(start);
        end = WebMercatorUtils.geographicToWebMercator(end);
      }
      trackFeatures.push(new Graphic(start));
      array.forEach(
        points,
        function(point) {
          var point = new Point(point.x, point.y);
          if (this.map.spatialReference.isWebMercator()) {
            point = WebMercatorUtils.geographicToWebMercator(point);
          }
          var graphic = new Graphic(point);
          trackFeatures.push(graphic);
        },
        this
      );
      trackFeatures.push(new Graphic(end));
      var routeTask = new RouteTask(this.routeLayerUrl);
      var routeParams = new RouteParameters();
      var featureSet = new FeatureSet();
      featureSet.features = trackFeatures;

      routeParams.stops = featureSet;
      routeParams.returnRoutes = true;
      routeParams.returnDirections = true;
      routeParams.directionsLengthUnits = Units.MILES;
      routeParams.outSpatialReference = new SpatialReference({ wkid: 4326 });
      routeTask.solve(
        routeParams,
        lang.hitch(this, function showRoute(evt) {
          def.resolve(evt.routeResults);
          var routeResults = evt.routeResults;
          if (routeResults.length > 0) {
            var paths = routeResults[0].route.geometry.paths;
            var polyline = new Polyline(paths);

            var routegra = new Graphic(polyline, this.defaultPolylineSymbol);
            routegra.id = id;
            this.hightlightLayer.add(routegra);
          }
        }),
        function(err) {
          def.reject(err);
        }
      );
      return def;
    },
    //生成缓冲区
    _doBuffer: function(geometry, bufferDistance) {
      var bufferPolygon;
      if (this.map.spatialReference.isWebMercator()) {
        geometry = WebMercatorUtils.geographicToWebMercator(geometry);
      }
      if (bufferDistance > 0 && geometry) {
        //如果是 WGS-84或Web Mercator坐标系，使用geodesicBuffer。其他坐标系使用buffer
        var bufferPolygon =
          this.map.spatialReference.wkid === 4326
            ? GeometryEngine.geodesicBuffer(
                geometry,
                bufferDistance,
                this.bufferUnit
              )
            : GeometryEngine.buffer(geometry, bufferDistance, this.bufferUnit);
      } else {
        bufferPolygon = geometry;
      }
      return bufferPolygon;
    },
    _getESRIColor: function(color, alpha, defaultColor) {
      //color如果是[r,g,b,a]形式
      if (color instanceof Array && color.length === 4) {
        //symbol.toJson方法有bug, 最后一位的a会转成0--255, 而不是0--1
        if (color[3] > 1) {
          color[3] = color[3] / 255;
        }
        return color;
      } else {
        //其他情况, 将color和alpha组合为[r, g, b, a]形式
        var esriColor = color ? new Color(color).toRgb() : defaultColor;
        esriColor[3] = !isNaN(alpha) ? alpha : 1;
        return esriColor;
      }
    },

    _getEsriPointSymbol: function(symbolObj) {
      var symbol;
      if (symbolObj) {
        switch (symbolObj.type.toLowerCase()) {
          //picture marker Symbol
          case "picture":
          case "esriPMS".toLowerCase():
            symbol = new PictureMarkerSymbol();
            symbol.url = window.path + symbolObj.url;
            if (!isNaN(symbolObj.width)) {
              symbol.width = symbolObj.width;
            }
            if (!isNaN(symbolObj.height)) {
              symbol.height = symbolObj.height;
            }
            symbol.angle = !isNaN(symbolObj.angle) ? symbolObj.angle : 0;
            symbol.xoffset = !isNaN(symbolObj.xoffset) ? symbolObj.xoffset : 0;
            symbol.yoffset = !isNaN(symbolObj.yoffset) ? symbolObj.yoffset : 0;
            break;

          //simple marker symbol
          case "marker":
          case "esriSMS".toLowerCase():
            symbol = new SimpleMarkerSymbol();
            symbol.style = symbolObj.style
              ? _jimuMarkerStyleToEsriStyle[symbolObj.style.toLowerCase()] ||
                SimpleMarkerSymbol.STYLE_CIRCLE
              : SimpleMarkerSymbol.STYLE_CIRCLE;
            symbol.color = this._getESRIColor(
              symbolObj.color,
              symbolObj.alpha,
              [0, 0, 0, 1]
            );
            symbol.size = !isNaN(symbolObj.size) ? symbolObj.size : 8;
            symbol.angle = !isNaN(symbolObj.angle) ? symbolObj.angle : 0;
            symbol.xoffset = !isNaN(symbolObj.xoffset) ? symbolObj.xoffset : 0;
            symbol.yoffset = !isNaN(symbolObj.yoffset) ? symbolObj.yoffset : 0;
            symbol.outline = this._getESRILineSymbol(symbolObj.outline);
            break;
        }
      } else {
        //默认为黑色圆点
        symbol = new SimpleMarkerSymbol(
          SimpleMarkerSymbol.STYLE_CIRCLE,
          8,
          new SimpleLineSymbol(new Color([255, 255, 255, 1]), 1),
          new Color([0, 0, 0, 1])
        );
      }

      return symbol;
    }
  });

  return clazz;
});
