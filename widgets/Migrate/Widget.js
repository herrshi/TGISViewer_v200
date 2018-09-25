define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "esri/geometry/Point",
  "esri/geometry/Geometry",
  "esri/geometry/webMercatorUtils",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/TextSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/Color",
  "esri/symbols/SimpleFillSymbol",
  "esri/tasks/QueryTask",
  "esri/tasks/query",
  "esri/graphic",
  "jimu/BaseWidget",
  "jimu/CustomLayers/MigrateEChartsLayer"
], function(
  declare,
  lang,
  array,
  topic,
  Point,
  Geometry,
  WebMercatorUtils,
  SimpleMarkerSymbol,
  TextSymbol,
  SimpleLineSymbol,
  Color,
  SimpleFillSymbol,
  QueryTask,
  Query,
  Graphic,
  BaseWidget,
  MigrateEChartsLayer
) {
  return declare([BaseWidget], {
    _echartsOver: null,
    _maxFlow: null,
    _geoCoordData: {},
    _geoNameData: {},

    _markLineData: [],
    _markPointData: [],
    postCreate: function() {
      this.inherited(arguments);

      this._initECharts();

      topic.subscribe(
        "showMigrate",
        lang.hitch(this, this._onTopicHandler_showMigrate)
      );
    },
    _initECharts: function() {
      this._echartsOver = new MigrateEChartsLayer(this.map, echarts);
      var myChart = this._echartsOver.initECharts(
        this._echartsOver.getEchartsContainer()
      );
      window.onresize = myChart.onresize;
      myChart.on("click", lang.hitch(this, this._chartLayerClick));
    },
    //{"sourceStationId":"station1","totalInFlow":1348,"totalOutFlow":2345,"inFlows":[{"stationId":"station2","flow":239},{"stationId":"station3","flow":287},{"stationId":"station4","flow":480}],"outFlows":[{"stationId":"station2","flow":239},{"stationId":"station3","flow":287},{"stationId":"station4","flow":480}]}
    _onTopicHandler_showMigrate: function(params) {
      var data = params;
      var ids = [];

      this._maxFlow =
        Number(params.totalInFlow) > Number(params.totalOutFlow)
          ? Number(params.totalInFlow)
          : Number(params.totalOutFlow);
      this._geoCoordData = {}; //各个点坐标
      this._geoNameData = {};

      this._markLineData = [];
      this._markPointData = [];
      this._markPointData.push({
        name: params.sourceStationId,
        value: Number(params.totalInFlow)
      });
      ids.push(params.sourceStationId);
      if (params.hasOwnProperty("inFlows")) {
        var inFlows = params.inFlows;
        for (var i = 0; i < inFlows.length; i++) {
          this._markLineData.push([
            { name: params.sourceStationId },
            { name: inFlows[i].stationId, value: inFlows[i].flow }
          ]);
          this._markPointData.push({
            name: inFlows[i].stationId,
            value: Number(inFlows[i].flow)
          });
          if (ids.indexOf(inFlows[i].stationId) < 0) {
            ids.push(inFlows[i].stationId);
          }
        }
      }
      if (params.hasOwnProperty("outFlows")) {
        var outFlows = params.outFlows;
        for (var i = 0; i < outFlows.length; i++) {
          this._markLineData.push([
            { name: outFlows[i].stationId },
            { name: params.sourceStationId, value: outFlows[i].flow }
          ]);
          if (ids.indexOf(outFlows[i].stationId) < 0) {
            ids.push(outFlows[i].stationId);
          }
        }
      }
      var queryTask = new QueryTask(this.config.query.url);
      var query = new Query();
      query.returnGeometry = true;
      query.where = "1=1";
      query.outFields = ["*"];
      queryTask.execute(
        query,
        lang.hitch(this, function(featureSet) {
          featureSet.features.forEach(function(graphic) {
            for (var j = 0; j < ids.length; j++) {
              if (ids[j] === graphic.attributes["StationInd"]) {
                this._geoNameData[ids[j]] = graphic.attributes["Name"];
                var point = graphic.geometry;
                this._geoCoordData[graphic.attributes["Name"]] =
                  graphic.geometry.points;

                if (j == 0) {
                  var sms = new SimpleMarkerSymbol(
                    SimpleMarkerSymbol.STYLE_PATH,
                    100,
                    new SimpleLineSymbol(
                      SimpleLineSymbol.STYLE_SOLID,
                      new Color([255, 0, 0, 0.5]),
                      0.9
                    ),
                    new Color([0, 0, 255, 0.5])
                  );
                  sms.setPath("M10 10 H 90 V 30 H 10 Z");
                  var tscount = new TextSymbol({
                    color: "white",
                    haloColor: "black",
                    haloSize: "1px",
                    text: "",
                    xoffset: 0,
                    yoffset: -25,
                    font: {
                      size: 18
                    }
                  });

                  //this.map.graphics.add(new Graphic(point, sms));
                  //this.map.graphics.add(new Graphic(point, tscount));
                }
              }
            }
          }, this);
          this._setMigrateOption();
        }),
        function(error) {
          console.log(error);
        }
      );
    },
    _setMigrateOption: function() {
      for (var i = 0; i < this._markPointData.length; i++) {
        var pt = this._markPointData[i];
        pt.name = this._geoNameData[pt.name];
      }
      for (var i = 0; i < this._markLineData.length; i++) {
        var line = this._markLineData[i];
        line[0].name = this._geoNameData[line[0].name];
        line[1].name = this._geoNameData[line[1].name];
      }
      var option = {
        color: ["gold", "aqua", "lime"],
        title: {
          text: "",
          subtext: "",
          x: "center",
          textStyle: {
            color: "#fff"
          }
        },
        tooltip: {
          trigger: "item",
          formatter: "{b}"
        },
        legend: {
          show: false,
          orient: "vertical",
          x: "left",
          data: ["上海 Top10"],
          //selectedMode: 'single',
          // selected:{
          //     '上海 Top10' : false,
          //     '广州 Top10' : false
          // },
          textStyle: {
            color: "#fff"
          }
        },
        toolbox: {
          show: false,
          orient: "vertical",
          x: "right",
          y: "center",
          feature: {
            mark: { show: true },
            dataView: { show: true, readOnly: false },
            restore: { show: true },
            saveAsImage: { show: true }
          }
        },
        dataRange: {
          show: false,
          min: 0,
          max: this._maxFlow,
          calculable: true,
          color: ["#ff3333", "orange", "yellow", "lime", "aqua"],
          textStyle: {
            color: "#fff"
          }
        },
        series: [
          {
            name: "上海 Top10",
            type: "map",
            mapType: "none",
            data: [],
            geoCoord: this
              ._geoCoordData /*{
                          station1: [121.321, 31.181],
                          station2: [121.327, 31.1856],
                          station3: [121.331, 31.189],
                          station4: [121.336, 31.194]
                      }*/,
            label: {
              normal: {
                formatter: "{b}",
                position: "right",
                show: false
              },
              emphasis: {
                show: false
              }
            },
            markLine: {
              smooth: true,
              effect: {
                show: true,
                scaleSize: 1,
                period: 30,
                color: "#fff",
                shadowBlur: 10
              },
              itemStyle: {
                normal: {
                  borderWidth: 1,
                  lineStyle: {
                    type: "solid",
                    shadowBlur: 5
                  },
                  emphasis: {
                    label: { position: "left" }
                  }
                }
              },
              data: this._markLineData
            },
            markPoint: {
              symbol: "circle",
              symbolSize: function(v) {
                return v / 50;
              },
              effect: {
                show: true,
                shadowBlur: 0
              },
              itemStyle: {
                normal: {
                  label: { show: false }
                },
                emphasis: {
                  label: { position: "top" }
                }
              },
              data: this._markPointData
            }
          }
        ]
      };
      this._echartsOver.setOption(option);
    },
    _chartLayerClick: function(event) {
      var dataIndex = event.dataIndex;
      console.log(event);
    }
  });
});
