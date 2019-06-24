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
    name: "TrackCompare",

    //距离. 距离越小,位置越精确
    stepLength: 0.0001,

    movingPointLayer: null,
    movingPointSymbol: null,

    trackPointLayer: null,
    trackPointSymbol: null,
    highlightPointSymbol: null,
    startPointSymbol: null,
    endPointSymbol: null,

    trackLineLayer: null,
    trackLineSymbol: null,
    planLineSymbol: null,
    sameLineSymbol: null,

    trackPoints: [],
    movingPointGraphic: null,
    movingFunction: null,
    //是否循环播放
    loop: null,
    //是否中点定位.
    _center: false,
    //是否层级变化.
    _zoom: false,

    startPointLayer: null,
    trackInterval: null,

    repeatCount: 0,
    currentCount: 0,

    kkPointLayer: null,
    kkInfo: null,
    kkPointSymbol: null,
    bufferUnit: GeometryService.UNIT_METER,

    postCreate: function() {
      this.inherited(arguments);

      this.trackLineLayer = new GraphicsLayer();
      this.map.addLayer(this.trackLineLayer);

      this.trackLineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([255, 0, 0, 0.5]),
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

      this.startPointLayer = new GraphicsLayer();
      this.map.addLayer(this.startPointLayer);

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

      //起始点图标未配置或配置不合法
      if (this.startPointSymbol === null) {
        this.startPointSymbol = new PictureMarkerSymbol(
          window.path + "images/mapIcons/TianJin/GongJiao/bus_start.png",
          26,
          42
        );
        this.startPointSymbol.yoffset = 21;
      }

      if (this.endPointSymbol === null) {
        this.endPointSymbol = new PictureMarkerSymbol(
          window.path + "images/mapIcons/TianJin/GongJiao/bus_end.png",
          26,
          42
        );
        this.endPointSymbol.yoffset = 21;
      }

      this.movingPointLayer = new GraphicsLayer();
      this.map.addLayer(this.movingPointLayer);

      if (this.movingPointSymbol === null) {
        this.movingPointSymbol = new PictureMarkerSymbol(
          window.path + "images/car_red.png",
          48,
          48
        );
      }

      topic.subscribe(
        "startTrackCompare",
        lang.hitch(this, this.onTopicHandler_startTrackPlayback)
      );
      topic.subscribe(
        "stopTrackCompare",
        lang.hitch(this, this.onTopicHandler_stopTrackPlayback)
      );
    },

    _clearData: function() {
      if (typeof this.movingFunction !== undefined) {
        clearInterval(this.movingFunction);
      }
      if (this.trackInterval !== undefined) {
        clearInterval(this.trackInterval);
      }
      this.currentCount = 0;
      this.startPointLayer.clear();
      this.kkPointLayer.clear();
      this.trackPointLayer.clear();
      this.trackLineLayer.clear();
      this.movingPointLayer.clear();
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

    onTopicHandler_startTrackPlayback: function(params) {
      params = JSON.parse(params);
      var autoStart = params.autoStart !== false;
      this.loop = params.loop !== false;
      var showTrackPoints = params.showTrackPoints !== false;

      var clearBefore = params.clearBefore !== false;

      this.repeatCount = params.repeatCount || 0;

      this._center = params.isCenter === true;
      this._zoom = params.isZoom === true;

      var carSymbol = params.symbol;
      if (carSymbol) {
        this.movingPointSymbol = this._getEsriPointSymbol(carSymbol);
      }

      if (clearBefore) {
        this._clearData();
      }

      this.trackPoints = this.checkTrackPoints(params.trackPoints);

      var planPoints = this.checkTrackPoints(params.planPoints);

      this._CompareLine(this.trackPoints, planPoints);

      //显示轨迹点
      if (showTrackPoints) {
        this._showTrackPoint(planPoints);
        this._showTrackPoint(this.trackPoints);
      }
      //移动
      if (autoStart) {
        this.movingPointLayer.clear();
        this.movingPointGraphic = new Graphic(
          new Point(this.trackPoints[0].x, this.trackPoints[0].y),
          this.movingPointSymbol
        );
        this.movingPointLayer.add(this.movingPointGraphic);
        this._movePoint(0, 1);
      }
    },
    _CompareLine: function(trackPoints, planPoints) {
      var path = array.map(trackPoints, function(trackPoint) {
        return [trackPoint.x, trackPoint.y];
      });
      var track = new Polyline([path]);

      var planpath = array.map(planPoints, function(planPoint) {
        return [planPoint.x, planPoint.y];
      });
      var plantrack = new Polyline([planpath]);

      if (this.map.spatialReference.isWebMercator()) {
        track = webMercatorUtils.geographicToWebMercator(track);
        plantrack = webMercatorUtils.geographicToWebMercator(plantrack);
      }
      var sameLine = GeometryEngine.intersect(track, plantrack);
      var trackDifLine = null;
      var planDifLine = null;
      if (sameLine) {
        trackDifLine = GeometryEngine.difference(track, sameLine);
        planDifLine = GeometryEngine.difference(plantrack, sameLine);
      } else {
        trackDifLine = track;
        planDifLine = plantrack;
      }

      var lineGraphic = new Graphic(trackDifLine);
      lineGraphic.symbol = this.trackLineSymbol;
      this.trackLineLayer.add(lineGraphic);

      var planGraphic = new Graphic(planDifLine);
      planGraphic.symbol = this.planLineSymbol;
      this.trackLineLayer.add(planGraphic);

      var sameGraphic = new Graphic(sameLine);
      sameGraphic.symbol = this.sameLineSymbol;
      this.trackLineLayer.add(sameGraphic);
    },

    _showTrackPoint: function(trackPoints, symbol) {
      array.forEach(
        trackPoints,
        function(trackPoint) {
          var point = new Point(trackPoint.x, trackPoint.y);
          if (this.map.spatialReference.isWebMercator()) {
            point = webMercatorUtils.geographicToWebMercator(point);
          }
          var graphic = new Graphic(point);
          if (trackPoint.id) {
            graphic.id = trackPoint.id;
          }
          graphic.symbol =
            trackPoint.isHighlight === true
              ? this.highlightPointSymbol
              : this.kkPointSymbol;
          graphic.attributes = trackPoint.fields;

          this.trackPointLayer.add(graphic);
          if (trackPoint.isHighlight === true && graphic.getNode()) {
            graphic.getNode().setAttribute("data-enlarge", "highlight");
          }
        },
        this
      );
    },
    _showTrackLine: function(trackPoints) {
      var path = array.map(trackPoints, function(trackPoint) {
        return [trackPoint.x, trackPoint.y];
      });
      var line = new Polyline([path]);
      var lineGraphic = new Graphic(line);
      lineGraphic.symbol = this.trackLineSymbol;
      this.trackLineLayer.add(lineGraphic);
    },
    /**播放移动动画*/
    _movePoint: function(startIndex, endIndex) {
      //卡口坐标,判断当前轨迹点是否在某卡口位置.

      if (startIndex == 0 && endIndex == 1) {
        if (this.repeatCount > 0 && this.currentCount >= this.repeatCount) {
          this._clearData();
          return;
        }
        this.currentCount++;
      }
      var x1 = this.trackPoints[startIndex].x;
      var y1 = this.trackPoints[startIndex].y;
      var x2 = this.trackPoints[endIndex].x;
      var y2 = this.trackPoints[endIndex].y;

      this._currentPointInfo(this.trackPoints[startIndex]);
      this._doCenter(x1, y1, x2, y2);

      var distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      // console.log("distance: " + distance);

      //如果两点距离小于步进, 直接移动到下一个点
      if (distance <= this.stepLength * 2) {
        this.movingPointGraphic.geometry.x = x2;
        this.movingPointGraphic.geometry.y = y2;

        this.movingPointLayer.clear();
        this.movingPointLayer.add(this.movingPointGraphic);

        startIndex++;
        endIndex++;

        if (endIndex == this.trackPoints.length) {
          this._currentPointInfo(this.trackPoints[endIndex - 1]);
        }

        if (endIndex < this.trackPoints.length) {
          this._movePoint(startIndex, endIndex);
        }
      } else {
        //斜率
        var p = (y2 - y1) / (x2 - x1);
        // console.log("p: " + p);
        this.movingFunction = setInterval(
          lang.hitch(this, function() {
            // this.startIndex = startIndex;
            // this.endIndex = endIndex;

            if (Math.abs(p) === Number.POSITIVE_INFINITY) {
              this.movingPointGraphic.geometry.y += this.stepLength;
            } else {
              if (x2 < x1) {
                this.movingPointGraphic.geometry.x -=
                  (1 / Math.sqrt(1 + p * p)) * this.stepLength;
              } else {
                this.movingPointGraphic.geometry.x +=
                  (1 / Math.sqrt(1 + p * p)) * this.stepLength;
              }

              if (y2 < y1) {
                this.movingPointGraphic.geometry.y -=
                  (Math.abs(p) / Math.sqrt(1 + p * p)) * this.stepLength;
              } else {
                this.movingPointGraphic.geometry.y +=
                  (Math.abs(p) / Math.sqrt(1 + p * p)) * this.stepLength;
              }

              this.movingPointGraphic.symbol.angle = this._calculateAngle(
                x1,
                y1,
                x2,
                y2
              );
            }

            this.movingPointLayer.clear();
            this.movingPointLayer.add(this.movingPointGraphic);

            if (
              Math.sqrt(
                Math.pow(x2 - this.movingPointGraphic.geometry.x, 2) +
                  Math.pow(y2 - this.movingPointGraphic.geometry.y, 2)
              ) < this.stepLength
            ) {
              clearInterval(this.movingFunction);
              startIndex++;
              endIndex++;

              if (endIndex == this.trackPoints.length) {
                this._currentPointInfo(this.trackPoints[endIndex - 1]);
              }

              if (endIndex < this.trackPoints.length) {
                this._movePoint(startIndex, endIndex);
              } else if (this.loop) {
                this.movingPointGraphic.geometry.x = this.trackPoints[0].x;
                this.movingPointGraphic.geometry.y = this.trackPoints[0].y;
                this._movePoint(0, 1);
              }
            }
          }),
          20
        );
      }
    },

    _calculateAngle: function(x1, y1, x2, y2) {
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
            point2 = webMercatorUtils.geographicToWebMercator(point2);
          }
          this.map.centerAt(point2);
        }
      }
    },
    _currentPointInfo: function(trackPoint) {
      var fields = trackPoint.fields || {};
      var id = trackPoint.id;

      if (this.kkInfo === null || this.kkInfo.id != id) {
        var obj = {};
        for (var str in fields) {
          obj[str] = fields[str];
        }
        this.kkInfo = obj;
        this.kkInfo.id = id || "";
        if (
          typeof showKKInfo !== "undefined" &&
          showKKInfo instanceof Function
        ) {
          showKKInfo(this.kkInfo);
        }
      }
    },
    onTopicHandler_stopTrackPlayback: function() {
      this._clearData();
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
});
