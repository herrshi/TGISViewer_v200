define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/_base/xhr",
  "esri/request",
  "esri/layers/GraphicsLayer",
  "esri/geometry/Point",
  "esri/geometry/Geometry",
  "esri/geometry/Circle",
  "esri/geometry/webMercatorUtils",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/TextSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/Color",
  "esri/symbols/Font",
  "esri/symbols/SimpleFillSymbol",
  "esri/tasks/QueryTask",
  "esri/tasks/query",
  "esri/graphic",
  "jimu/BaseWidget",
  "jimu/CustomLayers/MigrateEChartsLayer",
  "libs/echarts.source"
], function(
  declare,
  lang,
  array,
  topic,
  xhr,
  esriRequest,
  GraphicsLayer,
  Point,
  Geometry,
  Circle,
  WebMercatorUtils,
  SimpleMarkerSymbol,
  TextSymbol,
  SimpleLineSymbol,
  Color,
  Font,
  SimpleFillSymbol,
  QueryTask,
  Query,
  Graphic,
  BaseWidget,
  MigrateEChartsLayer,
  Echarts
) {
  return declare([BaseWidget], {
    _echartsOver: null,
    _maxFlow: 2000,
    _geoCoordData: {},
    _geoNameData: {},
    graphicsLayer: null,
    _markLineData: [],
    _markPointData: [],
    _FeatureId: null,
    _Name: null,
    _ODData: null,
    _inFlow: null,
    _params: null,
    postCreate: function() {
      this.inherited(arguments);

      this._initECharts();
      this.graphicsLayer = new GraphicsLayer();
      this.map.addLayer(this.graphicsLayer);
      this._FeatureId = this.config.query.id;
      this._Name = this.config.query.name;

      this.map.on("click", lang.hitch(this, this._SubLayerClick));

      topic.subscribe(
        "showMigrate",
        lang.hitch(this, this._onTopicHandler_showMigrate)
      );
      setInterval(lang.hitch(this, this._selectData), 900000);
    },
    _SubLayerClick: function(event) {
      var graphic;
      var mp = event.mapPoint;
      var queryTask = new QueryTask(this.config.query.url);
      var query = new Query();
      query.outFields = ["*"];
      query.returnGeometry = true;
      query.geometry = new Circle(mp, { radius: 100 });
      query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
      queryTask.execute(
        query,
        lang.hitch(this, function(featureSet) {
          if (featureSet.features.length > 0) {
            graphic = featureSet.features[0];
            if (graphic) {
              var id = graphic.attributes[this._FeatureId];
              if (
                typeof showSubInfo !== "undefined" &&
                showSubInfo instanceof Function
              ) {
                showSubInfo(
                  graphic.attributes[this._FeatureId],
                  graphic.attributes[this._Name]
                );
              }
            }
          }
        })
      );
    },
    _initECharts: function() {
      this._echartsOver = new MigrateEChartsLayer(this.map, echarts2);
      var myChart = this._echartsOver.initECharts(
        this._echartsOver.getEchartsContainer()
      );
      //window.onresize = myChart.onresize;
    },
    _onTopicHandler_showMigrate: function(params) {
      if (params === undefined || params === "") {
        this._hideMigrate();
        return;
      }
      this._params = params;
      if (this._ODData) {
        this._selectODData(params);
      } else {
        this._selectData();
      }
    },
    _selectData: function() {
      if (
        this.config.rest.type !== undefined &&
        this.config.rest.type === "1"
      ) {
        $.ajax({
          type: "GET",
          url: this.config.rest.url,
          dataType: "jsonp",
          jsonpCallback: "callBack",
          jsonp: "callBack", //服务端用于接收callback调用的function名的参数
          success: lang.hitch(this, function(res) {
            this._ODData = res;
            this._selectODData(this._params);
          })
        });
      } else {
        $.ajax({
          type: "GET",
          url: this.config.rest.url,
          dataType: "json",
          success: lang.hitch(this, function(res) {
            this._ODData = res;
            this._selectODData(this._params);
          })
        });
      }
    },
    _selectODData: function(params) {
      var id = params || "";
      var data = null;
      if (this._ODData) {
        for (var i = 0; i < this._ODData.length; i++) {
          if (this._ODData[i].sourceStationId == id) {
            data = this._ODData[i];
            break;
          }
        }
      }
      if (data != null) {
        this._showMigrate(data);
      }
    },
    _showMigrate: function(params) {
      var ids = [];
      this.graphicsLayer.clear();
      this._maxFlow =
        Number(params.totalInFlow) > Number(params.totalOutFlow)
          ? Number(params.totalInFlow)
          : Number(params.totalOutFlow);
      this._maxFlow = 4 * this._maxFlow;

      this._inFlow = Number(params.totalInFlow);

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
            { name: params.sourceStationId, type: 1 },
            { name: inFlows[i].stationId, value: inFlows[i].flow, type: 1 }
          ]);
          //this._markPointData.push({
          //  name: inFlows[i].stationId,
          //  value: Number(inFlows[i].flow)
          //});
          if (ids.indexOf(inFlows[i].stationId) < 0) {
            ids.push(inFlows[i].stationId);
          }
        }
      }
      if (params.hasOwnProperty("outFlows")) {
        var outFlows = params.outFlows;
        for (var i = 0; i < outFlows.length; i++) {
          this._markLineData.push([
            { name: outFlows[i].stationId, type: 0 },
            { name: params.sourceStationId, value: outFlows[i].flow, type: 0 }
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
              if (ids[j] === graphic.attributes[this._FeatureId]) {
                this._geoNameData[ids[j]] = graphic.attributes[this._Name];
                var point = graphic.geometry;
                this._geoCoordData[graphic.attributes[this._Name]] =
                  graphic.geometry.type === "multipoint"
                    ? graphic.geometry.points
                    : [[graphic.geometry.x, graphic.geometry.y]];

                if (j == 0) {
                  var sms = new SimpleMarkerSymbol(
                    SimpleMarkerSymbol.STYLE_PATH,
                    240,
                    new SimpleLineSymbol(
                      SimpleLineSymbol.STYLE_SOLID,
                      new Color([26, 109, 134, 0.8]),
                      2
                    ),
                    new Color([26, 109, 134, 0.3])
                  );
                  sms.setOffset(-150, 60);
                  sms.setPath("M0 0 H 240 V 60 H 0 Z");
                  var font = new Font(
                    "12pt",
                    Font.STYLE_NORMAL,
                    Font.VARIANT_NORMAL,
                    Font.WEIGHT_NORMAL,
                    "Microsoft YaHei"
                  );
                  var str = "站";
                  if (graphic.attributes[this._Name].indexOf("收费") > -1) {
                    str = "沪";
                  }
                  var textIn = new TextSymbol(
                    graphic.attributes[this._Name] +
                      "OD进" +
                      str +
                      "流量:" +
                      params.totalInFlow
                  )
                    .setColor(new Color([255, 255, 255]))
                    .setAngle(0)
                    .setOffset(-150, 70)
                    .setKerning(3)
                    .setFont(font);
                  var textOut = new TextSymbol(
                    graphic.attributes[this._Name] +
                      "OD出" +
                      str +
                      "流量:" +
                      params.totalOutFlow
                  )
                    .setColor(new Color([255, 255, 255]))
                    .setAngle(0)
                    .setOffset(-150, 40)
                    .setKerning(3)
                    .setFont(font);
                  var pt;
                  if (graphic.geometry.type === "multipoint") {
                    pt = new Point(point.points[0]);
                  } else {
                    pt = new Point([point.x, point.y]);
                  }

                  //this.graphicsLayer.add(new Graphic(pt, sms));
                    // this.graphicsLayer.add(new Graphic(pt, textIn));
                  //this.graphicsLayer.add(new Graphic(pt, textOut));
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
      var pointArr = [];
      var nameArr = [];
      var lineArr = [];
      for (var i = 0; i < this._markPointData.length; i++) {
        var pt = this._markPointData[i];
        pt.name = this._geoNameData[pt.name];
        if (pt.name !== undefined) {
          pointArr.push(pt);
        }
      }
      for (var i = 0; i < this._markLineData.length; i++) {
        var line = this._markLineData[i];
        line[0].name = this._geoNameData[line[0].name];
        line[1].name = this._geoNameData[line[1].name];
        if (line[0].name !== undefined && line[1].name !== undefined) {
          lineArr.push(line);
        }
      }
      var r = 100;

      if (this._inFlow < 5000) {
        r = 50;
      }
      if (this._inFlow < 1000) {
        r = 25;
      }
      if (this._inFlow < 100) {
        r = 5;
      }
      if (this._inFlow < 20) {
        r = 1;
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
          color: ["#ff3333", "yellow", "aqua"],
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
            geoCoord: this._geoCoordData,
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
                scaleSize: 2,
                period: 30,
                color: "#fff",
                shadowBlur: 10
              },
              itemStyle: {
                normal: {
                  borderWidth: 1,
                  color: function(obj) {
                    var d = obj.data;
                    var color = "red";
                    if (d[0].type == 1) {
                      color = "#00ffff";
                    } else {
                      color = "#FFD700";
                    }
                    return color;
                  },
                  lineStyle: {
                    type: "solid",
                    shadowBlur: 5
                  },
                  label: {
                    show: true,
                    position: "inside",
                    formatter: function(a) {
                      return a.value;
                    }
                  },
                  emphasis: {
                    label: { position: "left" }
                  }
                }
              },
              data: lineArr
            },
            markPoint: {
              symbol: "circle",
              symbolSize: function(v) {
                return v / r;
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
              data: pointArr
            }
          }
        ]
      };
      this._echartsOver.setOption(option);
    },
    _chartLayerClick: function(event) {
      var dataIndex = event.dataIndex;
      console.log(event);
    },
    _hideMigrate: function() {
      this._echartsOver._option = null;
      this._echartsOver._ec.clear();
      this.graphicsLayer.clear();
    }
  });
});
