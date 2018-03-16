define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "jimu/BaseWidget",
  "jimu/CustomLayers/ECharts3Layer"
], function (
  declare,
  lang,
  array,
  topic,
  BaseWidget,
  ECharts3Layer
) {
  return declare([BaseWidget], {
    _echartsOver: null,

    _planePath: "path://M1705.06,1318.313v-89.254l-319.9-221.799l0.073-208.063c0.521-84.662-26.629-121.796-63.961-121.491c-37.332-0.305-64.482,36.829-63.961,121.491l0.073,208.063l-319.9,221.799v89.254l330.343-157.288l12.238,241.308l-134.449,92.931l0.531,42.034l175.125-42.917l175.125,42.917l0.531-42.034l-134.449-92.931l12.238-241.308L1705.06,1318.313z",

    postCreate: function () {
      this.inherited(arguments);

      this._initECharts();

      // var script = document.createElement("script");
      // script.setAttribute("type", "text/javascript");
      // script.setAttribute("src", window.path + "libs/EChartsInArcGIS.js");
      // document.body.appendChild(script);

      topic.subscribe("showOD", lang.hitch(this, this._onTopicHandler_showOD));
    },

    _initECharts: function () {
      this._echartsOver = new ECharts3Layer(this.map, echarts);
      // var chartContainer = this._echartsOver.getEchartsContainer();
      this._echartsOver.initECharts(this._echartsOver.getEchartsContainer());
    },

    _onTopicHandler_showOD: function (params) {
      var type = params.type;
      var startID = params.startID;
      var startCoordinate = this.config.coordinateMap[startID];

      var color = type.toLowerCase() === "o" ? "#a6c84c" : "#ffa022";

      var seriesData = [];
      array.forEach(params.endFlows, function (endFlow) {
        var endID = endFlow.ID;
        var endCoordinate = this.config.coordinateMap[endID];
        if (startCoordinate && endCoordinate) {
          if (type.toLowerCase() === "o") {
            seriesData.push([{coord: startCoordinate}, {coord: endCoordinate}]);
          }
          else {
            seriesData.push([{coord: endCoordinate}, {coord: startCoordinate}]);
          }
        }
      }, this);

      var series = [];
      series.push({
        type: "lines",
        zlevel: 1,
        effect: {
          show: true,
          period: 6,
          trailLength: 0.7,
          color: "#fff",
          symbolSize: 3
        },
        lineStyle: {
          normal: {
            color: color,
            width: 0,
            curveness: 0.2
          }
        },
        data: seriesData
      }, {
        type: "lines",
        zlevel: 2,
        effect: {
          show: true,
          period: 6,
          trailLength: 0,
          symbol: this._planePath,
          symbolSize: 15
        },
        lineStyle: {
          normal: {
            color: color,
            width: 2,
            opacity: 0.4,
            curveness: 0.2
          }
        },
        data: seriesData
      }, {
        type: "effectScatter",
        coordinateSystem: "geo",
        zlevel: 2,
        rippleEffect: {
          brushType: "stroke"
        },
        label: {
          normal: {
            show: true,
            position: "right",
            formatter: "{b}"
          }
        },
        itemStyle: {
          normal: {
            color: color
          }
        },
        data: params.endFlows.map(lang.hitch(this, function (endFlow) {
          return {
            name: this.config.nameMap[endFlow.ID] + ":" + endFlow.flow,
            value: this.config.coordinateMap[endFlow.ID].concat(endFlow.flow)
          };
        })),
        symbolSize: function (val) {
          return val[2] / 10;
        }
      });
      var option = {
        title: {
          text: params.type.toLowerCase() === "o" ? "O分析" : "D分析",
          left: "center",
          textStyle: {
            color: "#fff"
          }
        },
        geo: {
          map: "",
          label: {
            emphasis: {
              show: false
            }
          },
          road: true,
          itemStyle: {
            normal: {
              areaColor: "#323c48",
              borderColor: "#404a59"
            },
            emphasis: {
              areaColor: "#2a333d"
            }
          }
        },
        series: series
      };
      this._echartsOver.setOption(option);

    }
  });
});