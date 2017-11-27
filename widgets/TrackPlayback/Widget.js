define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "jimu/BaseWidget",
  "jimu/CustomLayers/ECharts3Layer",
  "esri/graphic",
  "esri/geometry/Point",
  "esri/geometry/Polyline",
  "esri/layers/GraphicsLayer",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/Color",
  "esri/InfoTemplate"
], function (
  declare,
  lang,
  array,
  topic,
  BaseWidget,
  ECharts3Layer,
  Graphic,
  Point,
  Polyline,
  GraphicsLayer,
  PictureMarkerSymbol,
  SimpleLineSymbol,
  SimpleMarkerSymbol,
  Color,
  InfoTemplate
) {
  return declare([BaseWidget], {
    name: "TrackPlayback",


    movingPointLayer: null,
    movingPointSymbol: null,

    trackPointLayer: null,
    trackPointSymbol: null,

    trackLineLayer: null,
    trackLineSymbol: null,

    trackPoints: [],
    movingPointGraphic: null,
    movingFunction: null,
    //是否循环播放
    loop: null,

    postCreate: function () {
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
          new Color([255,255,255]),
          1
        ),
        new Color("53c7d4")
      );

      this.movingPointLayer = new GraphicsLayer();
      this.map.addLayer(this.movingPointLayer);

      this.movingPointSymbol = new PictureMarkerSymbol(window.path + "images/car_red.png", 48, 48);

      topic.subscribe("startTrackPlayback", lang.hitch(this, this.onTopicHandler_startTrackPlayback));
      topic.subscribe("stopTrackPlayback", lang.hitch(this, this.onTopicHandler_stopTrackPlayback));
    },

    _convertPointData: function (trackPoints) {
      return array.map(trackPoints, function (trackPoint) {
        return {
          name: trackPoint.time,
          value: [trackPoint.x, trackPoint.y]
        };
      });
    },

    _clearData: function () {
      if (typeof(this.movingFunction) !== undefined) {
        clearInterval(this.movingFunction);
      }
      this.trackPointLayer.clear();
      this.trackLineLayer.clear();
      this.movingPointLayer.clear();
    },


    onTopicHandler_startTrackPlayback: function (params) {
      this._clearData();

      var autoStart = params.autoStart !== false;
      this.loop = params.loop !== false;
      var showTrackPoints = params.showTrackPoints !== false;

      this.trackPoints = params.trackPoints;

      //显示轨迹点
      if (showTrackPoints) {
        array.forEach(this.trackPoints, function (trackPoint) {
          var point = new Point(trackPoint.x, trackPoint.y);
          var graphic = new Graphic(point);
          graphic.symbol = this.trackPointSymbol;
          graphic.infoTemplate = new InfoTemplate({content: "<b>经过时间: </b>" + trackPoint.time});
          this.trackPointLayer.add(graphic);
        }, this);
      }

      //显示轨迹线
      var path = array.map(this.trackPoints, function (trackPoint) {
        return [trackPoint.x, trackPoint.y];
      });
      var line = new Polyline([path]);
      var lineGraphic = new Graphic(line);
      lineGraphic.symbol = this.trackLineSymbol;
      this.trackLineLayer.add(lineGraphic);

      this.movingPointGraphic = new Graphic(new Point(this.trackPoints[0].x, this.trackPoints[0].y), this.movingPointSymbol);
      this.movingPointLayer.add(this.movingPointGraphic);
      if (autoStart) {
        this._movePoint(0, 1);
      }
    },

    _movePoint: function(startIndex, endIndex) {
      var x1 = this.trackPoints[startIndex].x;
      var y1 = this.trackPoints[startIndex].y;
      var x2 = this.trackPoints[endIndex].x;
      var y2 = this.trackPoints[endIndex].y;
      //斜率
      var p = (y2 - y1) / (x2 - x1);
      //距离. 距离越小,位置越精确
      var v = 0.001;
      this.movingFunction = setInterval(lang.hitch(this, function () {
        // this.startIndex = startIndex;
        // this.endIndex = endIndex;
        if (Math.abs(p) === Number.POSITIVE_INFINITY) {
          this.movingPointGraphic.geometry.y += v;
        }
        else {
          if (x2 < x1) {
            this.movingPointGraphic.geometry.x -= (1 / Math.sqrt (1 + p * p)) * v;
            this.movingPointGraphic.geometry.y -= (p / Math.sqrt (1 + p * p)) * v;
            this.movingPointGraphic.symbol.angle = this._calculateAngle (x1, y1, x2, y2);
          }
          else {
            this.movingPointGraphic.geometry.x += (1 / Math.sqrt (1 + p * p)) * v;
            this.movingPointGraphic.geometry.y += (p / Math.sqrt (1 + p * p)) * v;
            this.movingPointGraphic.symbol.angle = this._calculateAngle (x1, y1, x2, y2);
          }
        }
        this.movingPointLayer.redraw();
        if (Math.abs (this.movingPointGraphic.geometry.x - x2) <= v && Math.abs (this.movingPointGraphic.geometry.y - y2) <= v) {
          clearInterval (this.movingFunction);
          startIndex++;
          endIndex++;
          if (endIndex < this.trackPoints.length) {
            this._movePoint (startIndex, endIndex);
          }
          else if (this.loop) {
            this.movingPointGraphic.geometry.x = this.trackPoints[0].x;
            this.movingPointGraphic.geometry.y = this.trackPoints[0].y;
            this._movePoint(0, 1);
          }
        }
      }), 50);
    },

    _calculateAngle: function (x1, y1, x2, y2) {
      var tan = Math.atan (Math.abs ((y2 - y1) / (x2 - x1))) * 180 / Math.PI + 90;
      if (x2 > x1 && y2 > y1)//第一象限
      {
        return -tan + 180;
      }
      else if (x2 > x1 && y2 < y1)//第二象限
      {
        return tan;
      }
      else if (x2 < x1 && y2 > y1)//第三象限
      {
        return tan - 180;
      }
      else {
        return -tan;
      }
    },

    onTopicHandler_stopTrackPlayback: function () {
      this._clearData();
    }


  });
});