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
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
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
  SimpleMarkerSymbol,
  SimpleLineSymbol,
  Color,
  InfoTemplate
) {
  return declare([BaseWidget], {
    name: "TrackPlayback",

    echartsOverlay: null,

    trackPointLayer: null,
    trackPointSymbol: null,
    trackLineLayer: null,
    trackLineSymbol: null,

    postCreate: function () {
      this.echartsOverlay = new ECharts3Layer(this.map, echarts);
      var chartsContainer = this.echartsOverlay.getEchartsContainer();
      this.echartsOverlay.initECharts(chartsContainer);

      var option = {
        geo: {
          map: "",
          roam: true,
          itemStyle: {
            normal: {
              areaColor: "#323c48",
              borderColor: "#404a59"
            },
            emphasis: {
              areaColor: "#2a333d"
            }
          }
        }
      };
      this.echartsOverlay.setOption(option);


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
        8,
        new SimpleLineSymbol(new Color([255, 255, 255, 1]), 1),
        new Color([83, 199, 212, 1]));

      topic.subscribe("startTrackPlayback", lang.hitch(this, this.onTopicHandler_startTrackPlayback));
    },

    _convertPointData: function (trackPoints) {
      return array.map(trackPoints, function (trackPoint) {
        return {
          name: trackPoint.time,
          value: [trackPoint.x, trackPoint.y]
        };
      });
    },

    _convertLineData: function () {

    },

    onTopicHandler_startTrackPlayback: function (params) {
      var autoStart = params.autoStart !== false;
      var loop = params.loop !== false;
      var showTrackPoints = params.showTrackPoints !== false;
      // this.trackPointLayer.setVisibility(showTrackPoints);

      var echartsSeries = [];
      if (showTrackPoints) {
        echartsSeries.push({
          name: "轨迹点",
          type: "scatter",
          coordinateSystem: "geo",
          data: this._convertPointData(params.trackPoints),
          symbolSize: 12,
          label: {
            normal: {
              show: false
            },
            emphasis: {
              formatter: "{a}",
              position: "right",
              show: true
            }
          },
          itemStyle: {
            normal: {
              color: "#53c7d4",
              borderColor: "#fff",
              borderWidth: 1
            }
          }
        });
      }
      this.echartsOverlay.setOption({
        series: echartsSeries
      });

      // var trackPoints = params.trackPoints;
      // var path = [];
      // array.forEach(trackPoints, function (trackPoint) {
      //   var point = new Point(trackPoint.x, trackPoint.y);
      //   var graphic = new Graphic(point);
      //   graphic.symbol = this.trackPointSymbol;
      //   graphic.attributes = {time: trackPoint.time};
      //   graphic.infoTemplate = new InfoTemplate({content: "<b>经过时间: </b>${time}"});
      //   this.trackPointLayer.add(graphic);
      //
      //   path.push([trackPoint.x, trackPoint.y]);
      // }, this);
      //
      // var line = new Polyline([path]);
      // var lineGraphic = new Graphic(line);
      // lineGraphic.symbol = this.trackLineSymbol;
      // this.trackLineLayer.add(lineGraphic);

    }
  });
});