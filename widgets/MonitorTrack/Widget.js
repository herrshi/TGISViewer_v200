define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "jimu/BaseWidget",
  "esri/graphic",
  "esri/geometry/geometryEngine",
  "esri/tasks/GeometryService",
  "esri/geometry/Point",
  "esri/geometry/Polyline",
  "esri/geometry/Polygon",
  "esri/geometry/webMercatorUtils",
  "esri/layers/GraphicsLayer",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/jsonUtils",
  "esri/Color",
  "esri/InfoTemplate"
], function(
  declare,
  lang,
  array,
  topic,
  BaseWidget,
  Graphic,
  GeometryEngine,
  GeometryService,
  Point,
  Polyline,
  Polygon,
  webMercatorUtils,
  GraphicsLayer,
  PictureMarkerSymbol,
  SimpleLineSymbol,
  SimpleMarkerSymbol,
  SimpleFillSymbol,
  symbolJsonUtils,
  Color,
  InfoTemplate
) {
  var _jimuMarkerStyleToEsriStyle = {
    circle: SimpleMarkerSymbol.STYLE_CIRCLE,
    cross: SimpleMarkerSymbol.STYLE_CROSS,
    diamond: SimpleMarkerSymbol.STYLE_DIAMOND,
    square: SimpleMarkerSymbol.STYLE_SQUARE,
    x: SimpleMarkerSymbol.STYLE_X
  };
  return declare([BaseWidget], {
    name: "MonitorTrack",

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
    bufferUnit: GeometryService.UNIT_METER,
    _limit: 1, //0为限出,1位限进,

    postCreate: function() {
      this.inherited(arguments);

      this.trackLineLayer = new GraphicsLayer();
      this.map.addLayer(this.trackLineLayer);

      this.trackLineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([0, 255, 0, 0.5]),
        3
      );
      this.planLineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SHORTDASH,
        new Color([0, 255, 0, 0.5]),
        3
      );
      this.sameLineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([0, 255, 0, 0.5]),
        3
      );

      this.trackPointLayer = new GraphicsLayer();
      this.map.addLayer(this.trackPointLayer);

      this.kkPointLayer = new GraphicsLayer();
      this.map.addLayer(this.kkPointLayer);

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
        window.path + "images/mapIcons/wlmq/icon_kk.png",
        30,
        40
      );
      this.kkPointSymbol.yoffset = 20;

      this.inPointSymbol = new PictureMarkerSymbol(
        window.path + "images/mapIcons/TianJin/GongJiao/bus_start.png",
        26,
        42
      );
      this.inPointSymbol.yoffset = 21;

      this.outPointSymbol = new PictureMarkerSymbol(
        window.path + "images/mapIcons/TianJin/GongJiao/bus_end.png",
        26,
        42
      );
      this.outPointSymbol.yoffset = 21;
      this.startPointSymbol = new PictureMarkerSymbol(
        window.path + "images/mapIcons/TianJin/GongJiao/bus_start.png",
        26,
        42
      );
      this.startPointSymbol.yoffset = 21;
      this.endPointSymbol = new PictureMarkerSymbol(
        window.path + "images/mapIcons/TianJin/GongJiao/bus_end.png",
        26,
        42
      );
      this.endPointSymbol.yoffset = 21;

      this.movingPointLayer = new GraphicsLayer({"id":"moving"});
      this.map.addLayer(this.movingPointLayer);

      if (this.movingPointSymbol === null) {
        this.movingPointSymbol = new PictureMarkerSymbol(
          window.path + "images/car_red.png",
          48,
          48
        );
      }

      topic.subscribe(
        "startMonitorTrack",
        lang.hitch(this, this.onTopicHandler_MonitorTrack)
      );
      topic.subscribe(
        "clearMonitorTrack",
        lang.hitch(this, this.onTopicHandler_clearMonitorTrack)
      );
    },

    _clearData: function(params) {
      if (params === undefined || params === "" || params === null) {
        if (this.movingFunctions.length > 0) {
          array.forEach(this.movingFunctions, function(movingFunction) {
            clearInterval(movingFunction.interval);
          });
        }
        topic.publish("clearToolTip");
        this.kkPointLayer.clear();
        this.trackPointLayer.clear();
        this.trackLineLayer.clear();
        this.movingPointLayer.clear();
      } else {
        if (this.movingFunctions.length > 0) {
          array.forEach(this.movingFunctions, function(movingFunction) {
            if (params.indexOf(movingFunction.id) > -1) {
              clearInterval(movingFunction.interval);
            }
          });
        }
        topic.publish("clearToolTip", params);
        this.clearGraphic(
          [
            this.kkPointLayer,
            this.trackPointLayer,
            this.trackLineLayer,
            this.movingPointLayer
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
    /**检查轨迹点数据, 去掉重复数据*/
    checkTrackPoints: function(trackPoints) {
      for (var i = 1; i < trackPoints.length; i++) {
        if (
          trackPoints[i - 1].x === trackPoints[i].x &&
          trackPoints[i - 1].y === trackPoints[i].y
        ) {
          trackPoints.splice(i, 1);
          i--;
        }
      }
      return trackPoints;
    },

    onTopicHandler_MonitorTrack: function(params) {
      params = JSON.parse(params);
      var autoStart = params.autoStart !== false;
      var loop = params.loop !== false;
      var showTrack = params.showTrackPoints !== false;

      var repeatCount = params.repeatCount || 0;

      this._center = params.isCenter === true;
      this._zoom = params.isZoom === true;
      var limit = params.limit;
      var carSymbol = params.symbol;
      if (carSymbol) {
        carSymbol = this._getEsriPointSymbol(carSymbol);
      } else {
        carSymbol = this.movingPointSymbol;
      }
      var id = params.id || undefined;

      var trackPoints = this.checkTrackPoints(params.trackPoints || []);
      var kkPoints = params.kkPoints;
      var monitorArea;
      if (kkPoints && kkPoints.length > 0) {
        monitorArea = this._showMonitor(kkPoints, trackPoints, limit, id);
      }

      this._showTrackLine(trackPoints, id);
      //显示轨迹点
      if (showTrack) {
        this._showTrackPoint(trackPoints, carSymbol, id);
      }
      //显示起点和终点
      var startPoint = new Point(trackPoints[0].x, trackPoints[0].y);
      if (this.map.spatialReference.isWebMercator()) {
        startPoint = webMercatorUtils.geographicToWebMercator(startPoint);
      }
      var startGraphic = new Graphic(startPoint);
      startGraphic.symbol = this.startPointSymbol;
      this.trackPointLayer.add(startGraphic);

      var endPoint = new Point(
        trackPoints[trackPoints.length - 1].x,
        trackPoints[trackPoints.length - 1].y
      );
      if (this.map.spatialReference.isWebMercator()) {
        endPoint = webMercatorUtils.geographicToWebMercator(endPoint);
      }
      var endGraphic = new Graphic(endPoint);
      endGraphic.symbol = this.endPointSymbol;
      this.trackPointLayer.add(endGraphic);



      var context = "";
      if (
        limit === 1 &&
        monitorArea.contains(new Point([trackPoints[0].x, trackPoints[0].y]))
      ) {
        context = "车辆已经在限制区域内";
      }

      if (
        limit === 0 &&
        !monitorArea.contains(new Point([trackPoints[0].x, trackPoints[0].y]))
      ) {
        context = "车辆已经在限制区域外";
      }
      if (context != "") {
        var startPointGraphic = new Graphic(
          new Point(trackPoints[0].x, trackPoints[0].y),
          carSymbol
        );
        startPointGraphic.id = id;
        this.movingPointLayer.add(startPointGraphic);
        topic.publish("showToolTip", {
          graphic: startPointGraphic,
          context: context,
          id: id === undefined ? "mt1" : id,
          offset: 40
        });
        return;
      }
      //移动
      if (autoStart) {
        var movingPointGraphic = new Graphic(
          new Point(trackPoints[0].x, trackPoints[0].y),
          carSymbol
        );
        movingPointGraphic.id = id;
        this.movingPointLayer.add(movingPointGraphic);
        var data = {
          id: id,
          movingPointGraphic: movingPointGraphic,
          trackPoints: trackPoints,
          limit: limit,
          loop: loop,
          monitorArea: monitorArea,
          repeatCount: repeatCount,
          currentCount: 0
        };

        this._movePoint(0, 1, data);
      }
    },
    _showTrackPoint: function(trackPoints, symbol, id) {
      array.forEach(
        trackPoints,
        function(trackPoint) {
          var point = new Point(trackPoint.x, trackPoint.y);
          if (this.map.spatialReference.isWebMercator()) {
            point = webMercatorUtils.geographicToWebMercator(point);
          }
          var graphic = new Graphic(point);
          graphic.id = id;
          graphic.symbol =
            trackPoint.isHighlight === true
              ? this.highlightPointSymbol
              : this.trackPointSymbol;
          graphic.attributes = trackPoint.fields;

          this.trackPointLayer.add(graphic);
          if (trackPoint.isHighlight === true && graphic.getNode()) {
            graphic.getNode().setAttribute("data-enlarge", "highlight");
          }
        },
        this
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
    _showMonitor: function(kkPoints, trackPoints, limit, id) {
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
      var areaGraphic = new Graphic(area);
      areaGraphic.symbol = new SimpleFillSymbol(
        SimpleFillSymbol.STYLE_SOLID,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color([255, 0, 0, 0]),
          1
        ),
        new Color([255, 0, 0, 0.5])
      );
      areaGraphic.id = id;
      this.trackLineLayer.add(areaGraphic);
      var point = area.getExtent().getCenter();
      var pointGra = new Graphic(point);
      pointGra.id = id;
      if (limit === 1) {
        pointGra.symbol = this.inPointSymbol;
      } else {
        pointGra.symbol = this.outPointSymbol;
      }
      this.trackLineLayer.add(pointGra);
      return area;
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

      this._doCenter(x1, y1, x2, y2);

      var distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      //如果两点距离小于步进, 直接移动到下一个点
      if (distance <= this.stepLength * 2) {
        obj.movingPointGraphic.geometry.x = x2;
        obj.movingPointGraphic.geometry.y = y2;

        this.movingPointLayer.remove(obj.movingPointGraphic);
        this.movingPointLayer.add(obj.movingPointGraphic);

        if (
          (obj.limit === 1 &&
            obj.monitorArea.contains(obj.movingPointGraphic.geometry)) ||
          (obj.limit === 0 &&
            !obj.monitorArea.contains(obj.movingPointGraphic.geometry))
        ) {
          if (obj.loop) {
            obj.movingPointGraphic.geometry.x = obj.trackPoints[0].x;
            obj.movingPointGraphic.geometry.y = obj.trackPoints[0].y;
            this._movePoint(0, 1, obj);
          } else {
            return;
          }
        }

        startIndex++;
        endIndex++;

        if (endIndex < obj.trackPoints.length) {
          this._movePoint(startIndex, endIndex, obj);
        } else if (obj.loop) {
          obj.movingPointGraphic.geometry.x = obj.trackPoints[0].x;
          obj.movingPointGraphic.geometry.y = obj.trackPoints[0].y;
          this._movePoint(0, 1, obj);
        }
      } else {
        //斜率
        var p = (y2 - y1) / (x2 - x1);
        // console.log("p: " + p);

        var movingFunction = setInterval(
          lang.hitch(this, function() {
            var dis = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            // this.startIndex = startIndex;
            // this.endIndex = endIndex;
            if (Math.abs(p) === Number.POSITIVE_INFINITY) {
              if (y2 < y1) {
                obj.movingPointGraphic.geometry.y -= this.stepLength;
              } else {
                obj.movingPointGraphic.geometry.y += this.stepLength;
              }
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

            this.movingPointLayer.remove(obj.movingPointGraphic);
            this.movingPointLayer.add(obj.movingPointGraphic);

            if (
              (obj.limit === 1 &&
                obj.monitorArea.contains(obj.movingPointGraphic.geometry)) ||
              (obj.limit === 0 &&
                !obj.monitorArea.contains(obj.movingPointGraphic.geometry))
            ) {
              clearInterval(movingFunction);
              if (obj.loop) {
                obj.movingPointGraphic.geometry.x = obj.trackPoints[0].x;
                obj.movingPointGraphic.geometry.y = obj.trackPoints[0].y;

                this._movePoint(0, 1, obj);
              }
            }
            var subDis = Math.sqrt(
              Math.pow(x2 - obj.movingPointGraphic.geometry.x, 2) +
                Math.pow(y2 - obj.movingPointGraphic.geometry.y, 2)
            );

            if (subDis < this.stepLength * 2) {
              clearInterval(movingFunction);
              startIndex++;
              endIndex++;

              if (endIndex < obj.trackPoints.length) {
                this._movePoint(startIndex, endIndex, obj);
              } else if (obj.loop) {
                obj.movingPointGraphic.geometry.x = obj.trackPoints[0].x;
                obj.movingPointGraphic.geometry.y = obj.trackPoints[0].y;
                this._movePoint(0, 1, obj);
              }
            }
          }),
          20
        );
        this.movingFunctions.push({ id: obj.id, interval: movingFunction });
      }
    },

    _calculateAngle: function(x1, y1, x2, y2) {
      var tan;
      if (Math.abs(x2 - x1) < 0.000001) {
        tan = 90;
      } else if (Math.abs(y2 - y1) < 0.000001) {
        tan = 0;
      } else {
        tan = (Math.atan(Math.abs((y2 - y1) / (x2 - x1))) * 180) / Math.PI + 90;
      }

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
            point2 = webMercatorUtils.geographicToWebMercator(point2);
          }
          this.map.centerAt(point2);
        }
      }
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
    },
    onTopicHandler_clearMonitorTrack: function(params) {
      this._clearData(params);
    }
  });
});
