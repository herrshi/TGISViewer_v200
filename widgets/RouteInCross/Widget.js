/**
 * 由路口连成的路径
 * 选择一个路口以后, 地图上标出下游路口
 * */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "jimu/BaseWidget",
  "jimu/CustomLayers/ECharts3Layer"
], function (
  declare,
  lang,
  array,
  BaseWidget,
  ECharts3Layer
) {
  var clazz = declare([BaseWidget], {
    echartsOverlay: null,
    unSelectedCrossData: [],
    selectedCrossData: [],

    postCreate: function () {
      this.echartsOverlay = new ECharts3Layer(this.map, echarts);
      var chartsContainer = this.echartsOverlay.getEchartsContainer();
      var myChart = this.echartsOverlay.initECharts(chartsContainer);



      var selectedCrossSeries = {

      };

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
      // 使用刚指定的配置项和数据显示图表。
      this.echartsOverlay.setOption(option);

      this._showAllCross();


    },

    _getAllCrossData: function () {
      var crosses = this.config.crosses;
      array.forEach(crosses, function (crossConfig) {
        this.unSelectedCrossData.push({
          name: crossConfig.crossName,
          value: [crossConfig.x, crossConfig.y]
        });
      }, this);


    },

    _showAllCross: function () {
      this._getAllCrossData();

      var unSelectedCrossSeries = {
        name: "未选中路口",
        type: "scatter",
        coordinateSystem: "geo",
        data: this.unSelectedCrossData,
        symbolSize: 12,
        label: {
          normal: {
            show: false
          },
          emphasis: {
            show: true
          }
        },
        itemStyle: {
          emphasis: {
            borderColor: "#fff",
            borderWidth: 1
          }
        }
      };
      this.echartsOverlay.setOption({
        series: [unSelectedCrossSeries]
      })
    },

    _showPlaneLine: function () {
      var geoCoordMap = {
        "双流西站": [103.920, 30.546],
        "双流机场": [103.941, 30.569],
        "公兴站": [103.970, 30.479],
        "旗江站": [103.961, 30.444],
        "成都艺术职业学院": [103.972, 30.324],
        "乾园生态园": [104.109, 30.282]
      };

      var BJData = [
        [{name: "双流西站"}, {name: "双流机场", value: 95}],
        [{name: "双流西站"}, {name: "公兴站", value: 90}],
        [{name: "双流西站"}, {name: "旗江站", value: 80}],
        [{name: "双流西站"}, {name: "成都艺术职业学院", value: 70}],
        [{name: "双流西站"}, {name: "乾园生态园", value: 60}]
      ];

      var planePath = "path://M1705.06,1318.313v-89.254l-319.9-221.799l0.073-208.063c0.521-84.662-26.629-121.796-63.961-121.491c-37.332-0.305-64.482,36.829-63.961,121.491l0.073,208.063l-319.9,221.799v89.254l330.343-157.288l12.238,241.308l-134.449,92.931l0.531,42.034l175.125-42.917l175.125,42.917l0.531-42.034l-134.449-92.931l12.238-241.308L1705.06,1318.313z";

      var convertData = function (data) {
        var res = [];
        for (var i = 0; i < data.length; i++) {
          var dataItem = data[i];
          var fromCoord = geoCoordMap[dataItem[0].name];
          var toCoord = geoCoordMap[dataItem[1].name];
          if (fromCoord && toCoord) {
            res.push([{
              coord: fromCoord
            }, {
              coord: toCoord
            }]);
          }
        }
        return res;
      };

      var color = ["#a6c84c", "#ffa022", "#46bee9"];
      var series = [];
      [["北京", BJData]].forEach(function (item, i) {
        series.push(
          {
            name: item[0] + " Top10",
            type: "lines",
            zlevel: 1,
            animation: false,
            effect: {
              show: true,
              // period: 6,
              constantSpeed: 10,
              trailLength: 0.7,
              color: "#fff",
              symbolSize: 3
            },
            lineStyle: {
              normal: {
                color: color[i],
                width: 0,
                curveness: 0.2
              }
            },
            data: convertData(item[1])
          },
          {
            name: item[0] + " Top10",
            type: "lines",
            zlevel: 2,
            animation: false,
            effect: {
              show: true,
              // period: 6,
              constantSpeed: 10,
              trailLength: 0,
              symbol: planePath,
              symbolSize: 15
            },
            lineStyle: {
              normal: {
                color: color[i],
                width: 1,
                opacity: 0.4,
                curveness: 0.2
              }
            },
            data: convertData(item[1])
          },
          {
            name: item[0] + " Top10",
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
            symbolSize: function (val) {
              return val[2] / 8;
            },
            itemStyle: {
              normal: {
                color: color[i]
              }
            },
            data: item[1].map(function (dataItem) {
              return {
                name: dataItem[1].name,
                value: geoCoordMap[dataItem[1].name].concat([dataItem[1].value])
              };
            })
          });
      });

      var option = {
        geo: {
          map: "",
          label: {
            emphasis: {
              show: false
            }
          },
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
        },
        series: series
      };
      // 使用刚指定的配置项和数据显示图表。
      this.echartsOverlay.setOption(option);
    }
  });

  return clazz;
});