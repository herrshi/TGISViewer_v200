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
  return declare([BaseWidget], {
    name: "TrackPlayback",

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

    kkPoints: null,
    kkPointLayer: null,
    kkInfo: null,
    kkPointSymbol: null,
    showKKPoint: false,
    bufferUnit: GeometryService.UNIT_METER,

    postCreate: function() {
      this.inherited(arguments);

      this.trackLineLayer = new GraphicsLayer();
      this.map.addLayer(this.trackLineLayer);

      this.trackLineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([0, 0, 255, 1]),
        8
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
      if (this.config.symbol.startPoint) {
        this.startPointSymbol = symbolJsonUtils.fromJson(
          this.config.symbol.startPoint
        );
        if (this.startPointSymbol instanceof PictureMarkerSymbol) {
          this.startPointSymbol.url = window.path + this.startPointSymbol.url;
        }
      }
      //起始点图标未配置或配置不合法
      if (this.startPointSymbol === null) {
        this.startPointSymbol = new PictureMarkerSymbol(
          window.path + "images/mapIcons/TianJin/GongJiao/bus_start.png",
          26,
          42
        );
        this.startPointSymbol.yoffset = 21;
      }

      if (this.config.symbol.endPoint) {
        this.endPointSymbol = symbolJsonUtils.fromJson(
          this.config.symbol.endPoint
        );
        if (this.endPointSymbol instanceof PictureMarkerSymbol) {
          this.endPointSymbol.url = window.path + this.endPointSymbol.url;
        }
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

      if (this.config.symbol.movingPoint) {
        this.movingPointSymbol = symbolJsonUtils.fromJson(
          this.config.symbol.movingPoint
        );
        if (this.movingPointSymbol instanceof PictureMarkerSymbol) {
          this.movingPointSymbol.url = window.path + this.movingPointSymbol.url;
        }
      }
      if (this.movingPointSymbol === null) {
        this.movingPointSymbol = new PictureMarkerSymbol(
          window.path + "images/car_red.png",
          48,
          48
        );
      }

      topic.subscribe(
        "startTrackPlayback",
        lang.hitch(this, this.onTopicHandler_startTrackPlayback)
      );
      topic.subscribe(
        "stopTrackPlayback",
        lang.hitch(this, this.onTopicHandler_stopTrackPlayback)
      );
      topic.subscribe(
        "findFeature",
        lang.hitch(this, this.onTopicHandler_findFeature)
      );
      topic.subscribe(
        "drawTrackPlayback",
        lang.hitch(this, this.onTopicHandler_drawTrackPlayback)
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

    _getInfoWindowContent: function(graphic) {
      var content = "";
      //键值对
      for (var fieldName in graphic.attributes) {
        if (graphic.attributes.hasOwnProperty(fieldName)) {
          content +=
            "<b>" +
            fieldName +
            ": </b>" +
            graphic.attributes[fieldName] +
            "<br>";
        }
      }
      //去掉最后的<br>
      content = content.substring(0, content.lastIndexOf("<br>"));

      //按钮
      if (graphic.buttons !== undefined) {
        content += "<hr>";
        array.forEach(graphic.buttons, function(buttonConfig) {
          content +=
            "<button type='button' class='btn btn-primary btn-xs' onclick='mapFeatureClicked(" +
            '"' +
            buttonConfig.type +
            '", "' +
            graphic.id +
            '"' +
            ")'>" +
            buttonConfig.label +
            "</button>  ";
        });
      }

      return content;
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

      if (clearBefore) {
        this._clearData();
      }

      this.trackPoints = this.checkTrackPoints(params.trackPoints);

      this.kkPoints = params.kkPoints || undefined;
      this.showKKPoint = params.showKKPoint !== false;

      //显示起点和终点
      var startPoint = new Point(this.trackPoints[0].x, this.trackPoints[0].y);
      if (this.map.spatialReference.isWebMercator()) {
        startPoint = webMercatorUtils.geographicToWebMercator(startPoint);
      }
      var startGraphic = new Graphic(startPoint);
      startGraphic.symbol = this.startPointSymbol;
      this.trackPointLayer.add(startGraphic);

      var endPoint = new Point(
        this.trackPoints[this.trackPoints.length - 1].x,
        this.trackPoints[this.trackPoints.length - 1].y
      );
      if (this.map.spatialReference.isWebMercator()) {
        endPoint = webMercatorUtils.geographicToWebMercator(endPoint);
      }
      var endGraphic = new Graphic(endPoint);
      endGraphic.symbol = this.endPointSymbol;
      this.trackPointLayer.add(endGraphic);

      //显示轨迹点
      if (showTrackPoints) {
        array.forEach(
          this.trackPoints,
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
                : this.trackPointSymbol;
            graphic.attributes = trackPoint.fields;
            if (!params.defaultInfoTemplate) {
              graphic.infoTemplate = new InfoTemplate({
                content: this._getInfoWindowContent(graphic)
              });
            } else {
              var infoTemplate = new InfoTemplate();
              infoTemplate.setTitle(
                params.defaultInfoTemplate.title == ""
                  ? null
                  : params.defaultInfoTemplate.title
              );
              infoTemplate.setContent(params.defaultInfoTemplate.content);
              graphic.setInfoTemplate(infoTemplate);
            }
            this.trackPointLayer.add(graphic);
            if (trackPoint.isHighlight === true && graphic.getNode()) {
              graphic.getNode().setAttribute("data-enlarge", "highlight");
            }
          },
          this
        );
      }

      //显示轨迹线
      var path = array.map(this.trackPoints, function(trackPoint) {
        return [trackPoint.x, trackPoint.y];
      });
      var line = new Polyline([path]);
      var lineGraphic = new Graphic(line);
      lineGraphic.symbol = this.trackLineSymbol;
      this.trackLineLayer.add(lineGraphic);

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
      if (this.kkPoints && this.kkPoints.length > 0) {
        this._currentPointInfo(new Point([x1, y1]));
      }
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
          if (this.kkPoints && this.kkPoints.length > 0) {
            this._currentPointInfo(this.movingPointGraphic.geometry);
          }
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
                if (this.kkPoints && this.kkPoints.length > 0) {
                  this._currentPointInfo(this.movingPointGraphic.geometry);
                }
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
    onTopicHandler_stopTrackPlayback: function() {
      this._clearData();
    },

    onTopicHandler_findFeature: function(params) {
      if (
        params.params.layerName.toLowerCase() === "trackPlayback".toLowerCase()
      ) {
        array.forEach(
          this.trackPointLayer.graphics,
          function(trackPointGraphic) {
            if (trackPointGraphic.id === params.params.ids[0]) {
              this.map.centerAt(trackPointGraphic.geometry);

              var node = trackPointGraphic.getNode();
              node.setAttribute("data-highlight", "highlight");
              setTimeout(function() {
                node.setAttribute("data-highlight", "");
              }, 5000);
            }
          },
          this
        );
      }
    },

    onTopicHandler_drawTrackPlayback: function(params) {
      params = JSON.parse(params);
      var showTrackPoints = params.showTrackPoints !== false;

      var clearBefore = params.clearBefore !== false;

      if (clearBefore) {
        this._clearData();
      }
      var defaultInfoTemplate = params.defaultInfoTemplate;
      this.trackPoints = this.checkTrackPoints(params.trackPoints);

      //显示起点和终点
      var startPoint = new Point(this.trackPoints[0].x, this.trackPoints[0].y);
      if (this.map.spatialReference.isWebMercator()) {
        startPoint = webMercatorUtils.geographicToWebMercator(startPoint);
      }
      var startGraphic = new Graphic(startPoint);
      startGraphic.symbol = this.startPointSymbol;
      this.startPointLayer.add(startGraphic);

      var index = 1;

      this.trackInterval = setInterval(
        lang.hitch(this, function() {
          index++;
          if (index <= this.trackPoints.length) {
            var trackpoints = this.trackPoints.slice(0, index);
            this._drawTrackLine(
              trackpoints,
              defaultInfoTemplate,
              showTrackPoints
            );
          } else {
            var endPoint = new Point(
              this.trackPoints[this.trackPoints.length - 1].x,
              this.trackPoints[this.trackPoints.length - 1].y
            );
            if (this.map.spatialReference.isWebMercator()) {
              endPoint = webMercatorUtils.geographicToWebMercator(endPoint);
            }
            var endGraphic = new Graphic(endPoint);
            endGraphic.symbol = this.endPointSymbol;
            this.startPointLayer.add(endGraphic);
            clearInterval(this.trackInterval);
          }
        }),
        100
      );
    },
    _drawTrackLine: function(
      trackPoints,
      defaultInfoTemplate,
      showTrackPoints
    ) {
      this.trackPointLayer.clear();
      this.trackLineLayer.clear();
      //显示轨迹点
      if (showTrackPoints) {
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
                : this.trackPointSymbol;
            graphic.attributes = trackPoint.fields;
            if (!defaultInfoTemplate) {
              graphic.infoTemplate = new InfoTemplate({
                content: this._getInfoWindowContent(graphic)
              });
            } else {
              var infoTemplate = new InfoTemplate();
              infoTemplate.setTitle(
                defaultInfoTemplate.title == ""
                  ? null
                  : defaultInfoTemplate.title
              );
              infoTemplate.setContent(defaultInfoTemplate.content);
              graphic.setInfoTemplate(infoTemplate);
            }
            this.trackPointLayer.add(graphic);
            if (trackPoint.isHighlight === true && graphic.getNode()) {
              graphic.getNode().setAttribute("data-enlarge", "highlight");
            }
          },
          this
        );
      }

      //显示轨迹线
      var path = array.map(trackPoints, function(trackPoint) {
        return [trackPoint.x, trackPoint.y];
      });
      var line = new Polyline([path]);
      var lineGraphic = new Graphic(line);
      lineGraphic.symbol = this.trackLineSymbol;
      this.trackLineLayer.add(lineGraphic);
    },
    _currentPointInfo: function(trackPoint) {
      if (this.kkPoints && this.kkPoints.length > 0) {
        for (var i = 0; i < this.kkPoints.length; i++) {
          var kkpoint = new Point([this.kkPoints[i].x, this.kkPoints[i].y]);
          var fields = this.kkPoints[i].fields || {};
          var id = this.kkPoints[i].id;
          if (this.showKKPoint) {
            var kkGraphic = new Graphic(kkpoint, this.kkPointSymbol, fields);
            this.kkPointLayer.add(kkGraphic);
          }

          var kkBuffer = this._doBuffer(kkpoint, 50);

          /*var bufferGraphic = new Graphic(
            kkBuffer,
            new SimpleFillSymbol(
              SimpleFillSymbol.STYLE_SOLID,
              new SimpleLineSymbol(
                SimpleLineSymbol.STYLE_SOLID,
                new Color([255, 105, 180, 0.2]),
                1
              ),
              new Color([255, 105, 180, 0.2])
            ),
            fields
          );
          this.kkPointLayer.add(bufferGraphic);*/

          if (kkBuffer.contains(trackPoint)) {
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
          }
        }
      }
    },
    //生成缓冲区
    _doBuffer: function(geometry, bufferDistance) {
      var bufferPolygon;
      if (this.map.spatialReference.isWebMercator()) {
        geometry = webMercatorUtils.geographicToWebMercator(geometry);
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
    }
  });
});
