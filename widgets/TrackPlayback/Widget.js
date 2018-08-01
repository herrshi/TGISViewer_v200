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
  Point,
  Polyline,
  webMercatorUtils,
  GraphicsLayer,
  PictureMarkerSymbol,
  SimpleLineSymbol,
  SimpleMarkerSymbol,
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

    postCreate: function() {
      this.inherited(arguments);

      this.trackLineLayer = new GraphicsLayer();
      this.map.addLayer(this.trackLineLayer);

      this.trackLineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([48, 59, 88, 1]),
        4
      );

      this.trackPointLayer = new GraphicsLayer();
      this.map.addLayer(this.trackPointLayer);

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
    },

    _clearData: function() {
      if (typeof this.movingFunction !== undefined) {
        clearInterval(this.movingFunction);
      }
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
      this._clearData();

      params = JSON.parse(params);
      var autoStart = params.autoStart !== false;
      this.loop = params.loop !== false;
      var showTrackPoints = params.showTrackPoints !== false;

      this.trackPoints = this.checkTrackPoints(params.trackPoints);

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
      var x1 = this.trackPoints[startIndex].x;
      var y1 = this.trackPoints[startIndex].y;
      var x2 = this.trackPoints[endIndex].x;
      var y2 = this.trackPoints[endIndex].y;

      var distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      // console.log("distance: " + distance);

      //如果两点距离小于步进, 直接移动到下一个点
      if (distance <= this.stepLength * 2) {
        this.movingPointGraphic.geometry.x = x2;
        this.movingPointGraphic.geometry.y = y2;
        this.movingPointLayer.refresh();
        startIndex++;
        endIndex++;
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
            this.movingPointLayer.refresh();
            if (
              Math.sqrt(
                Math.pow(x2 - this.movingPointGraphic.geometry.x, 2) +
                  Math.pow(y2 - this.movingPointGraphic.geometry.y, 2)
              ) < this.stepLength
            ) {
              clearInterval(this.movingFunction);
              startIndex++;
              endIndex++;
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
    }
  });
});
