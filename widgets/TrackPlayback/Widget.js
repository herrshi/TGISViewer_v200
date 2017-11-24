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
  "esri/Color"
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
  Color
) {
  return declare([BaseWidget], {
    name: "TrackPlayback",

    echartsOverlay: null,
    echartsInstance: null,

    movingPointLayer: null,
    movingPointSymbol: null,
    trackLineLayer: null,
    trackLineSymbol: null,

    trackPoints: [],
    movingPointGraphic: null,
    movingFunction: null,
    //是否循环播放
    loop: null,

    postCreate: function () {
      this.inherited(arguments);

      this.echartsOverlay = new ECharts3Layer(this.map, echarts);
      var chartsContainer = this.echartsOverlay.getEchartsContainer();
      this.echartsInstance = this.echartsOverlay.initECharts(chartsContainer);




      this.trackLineLayer = new GraphicsLayer();
      this.map.addLayer(this.trackLineLayer);

      this.trackLineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([48, 59, 88, 1]),
        4
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
      this.trackLineLayer.clear();
      this.movingPointLayer.clear();
      if (this.echartsOverlay) {
        // this.echartsOverlay.setOption({
        //   series: null
        // });
        this.echartsOverlay.setOption({});
      }
    },


    onTopicHandler_startTrackPlayback: function (params) {
      this._clearData();

      var option = {
        tooltip: {
          trigger: "item"
        },
        geo: {
          map: "",
          roam: true
        }
      };
      this.echartsOverlay.setOption(option);

      var autoStart = params.autoStart !== false;
      this.loop = params.loop !== false;
      var showTrackPoints = params.showTrackPoints !== false;

      this.trackPoints = params.trackPoints;

      //显示轨迹点
      if (showTrackPoints) {
        this.echartsOverlay.setOption({
          series: [
            {
              name: "轨迹点",
              type: "scatter",
              coordinateSystem: "geo",
              data: this._convertPointData(this.trackPoints),
              zlevel: 2,
              symbolSize: 12,
              tooltip: {
                formatter: "{b}"
              },
              itemStyle: {
                normal: {
                  color: "#53c7d4",
                  borderColor: "#fff",
                  borderWidth: 1
                }
              }
            }
          ]
        });
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