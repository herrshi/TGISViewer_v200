define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/_base/xhr",
  "esri/request",
  "esri/InfoTemplate",
  "esri/layers/GraphicsLayer",
  "esri/SpatialReference",
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
  InfoTemplate,
  GraphicsLayer,
  SpatialReference,
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
    _odColor: null,
    _colorField: null,
    _clickEvent: null,
    _PointIds: [], //两场三站id;
    _selectIds: [], //
    _zoom: null,
    _inFlows: [],
    _outFlows: [],
    _flowType: 0,
    fontFamily: new Font(
      "12pt",
      Font.STYLE_NORMAL,
      Font.VARIANT_NORMAL,
      Font.WEIGHT_NORMAL,
      "Microsoft YaHei"
    ),
    markPointColors: [
      "rgba(0, 0, 255, 0.6)",
      "rgba(0, 128,0, 0.6)",
      "rgba(255,140,0, 0.7)",
      "rgba(255, 0,0, 0.6)"
    ],
    postCreate: function() {
      this.inherited(arguments);

      this._initECharts();
      this.graphicsLayer = new GraphicsLayer();
      this.map.addLayer(this.graphicsLayer);
      this._FeatureId = this.config.query ? this.config.query.id : "";
      this._Name = this.config.query ? this.config.query.name : "";
      this._colorField = this.config.colorField;

      topic.subscribe(
        "showMigrate",
        lang.hitch(this, this._onTopicHandler_showMigrate)
      );
      topic.subscribe(
        "showMigrateData",
        lang.hitch(this, this._onTopicHandler_showMigrateData)
      );
      topic.subscribe(
        "showMigrateCharts",
        lang.hitch(this, this._onTopicHandler_showMigrateCharts)
      );

      topic.subscribe(
        "hideMigrateCharts",
        lang.hitch(this, this._onTopicHandler_hideMigrateCharts)
      );

      if (this.config.rest) {
        setInterval(lang.hitch(this, this._selectData), 900000);
      }
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
              this._odColor = this.getColor(graphic);
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
        if (this._clickEvent) {
          this._clickEvent.remove();
        }
        return;
      }
      this._params = params;
      if (this._clickEvent == null) {
        this._clickEvent = this.map.on(
          "click",
          lang.hitch(this, this._SubLayerClick)
        );
      }

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
    _onTopicHandler_showMigrateData: function(params) {
      this._showMigrate(params);
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
      if (this.config.query) {
        this._queryData(ids, params);
      }
      if (this.config.coordinateMap) {
        this._coordinateMapData(params);
      }
    },
    _queryData: function(ids, params) {
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
                this._odColor = this.getColor(graphic);
                if (j == 0) {
                  var str = "站";
                  if (graphic.attributes[this._Name].indexOf("收费") > -1) {
                    str = "沪";
                  }
                  var textIn =
                    graphic.attributes[this._Name] +
                    "OD进" +
                    str +
                    "流量:" +
                    params.totalInFlow;
                  var textOut =
                    graphic.attributes[this._Name] +
                    "OD进" +
                    str +
                    "流量:" +
                    params.totalOutFlow;
                  var pt;
                  if (graphic.geometry.type === "multipoint") {
                    pt = new Point(point.points[0]);
                  } else {
                    pt = new Point([point.x, point.y]);
                  }
                }
              }
            }
          }, this);
          this._setMigrateOption(true);
        }),
        function(error) {
          console.log(error);
        }
      );
    },
    _coordinateMapData: function(params) {
      var coordinateMap = {};
      var nameMap = this.config.nameMap;
      var id = params.sourceStationId;
      var effect = params.effect !== false;
      var point;
      for (var coord in this.config.coordinateMap) {
        if (id == coord) {
          point = new Point(this.config.coordinateMap[coord]);
        }
        coordinateMap[coord] = [this.config.coordinateMap[coord]];
      }
      var pointName = "";
      for (var name in nameMap) {
        if (id == name) {
          pointName = nameMap[name];
        }
      }
      var inText = pointName + "OD进流量：" + params.totalInFlow;
      var outText = pointName + "OD进流量：" + params.totalOutFlow;
      this._geoCoordData = coordinateMap;
      //this._geoNameData = nameMap;
      this._setMigrateText(point, inText, outText);
      this._setMigrateOption(effect);
    },
    _setMigrateText: function(point, inText, outText) {
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
      var textIn = new TextSymbol(inText)
        .setColor(new Color([255, 255, 255]))
        .setAngle(0)
        .setOffset(-150, 70)
        .setKerning(3)
        .setFont(font);
      var textOut = new TextSymbol(outText)
        .setColor(new Color([255, 255, 255]))
        .setAngle(0)
        .setOffset(-150, 40)
        .setKerning(3)
        .setFont(font);
      this.graphicsLayer.add(new Graphic(point, sms));
      this.graphicsLayer.add(new Graphic(point, textIn));
      this.graphicsLayer.add(new Graphic(point, textOut));
    },
    _chartLayerClick: function(event) {
      var dataIndex = event.dataIndex;
      console.log(event);
    },
    _hideMigrate: function() {
      this._echartsOver._option = null;
      this._echartsOver._ec.clear();
      this.graphicsLayer.clear();
    },
    getColor: function(gra) {
      var color = "aqua";
      if (gra.attributes[this._colorField] === undefined) {
        return color;
      } else if (gra.attributes[this._colorField] === "crowd") {
        color = "yellow";
      } else if (gra.attributes[this._colorField] === "jam") {
        color = "#ff3333";
      } else if (gra.attributes[this._colorField] === "free") {
        color = "aqua";
      }
      return color;
    },
    //查找数组元素,返回index
    findIndex: function(arr, el) {
      var num = -1;
      arr.forEach(function(ol, index) {
        if (
          el.startid === ol.startid &&
          el.endid === ol.endid &&
          el.name === ol.name &&
          el.type === ol.type
        ) {
          num = index;
        }
      });
      return num;
    },
    sumElement: function(arr) {
      var lineFlows = [];
      arr.forEach(function(flow) {
        var result = this.findIndex(lineFlows, flow);
        if (result !== -1) {
          lineFlows[result].value = lineFlows[result].value + flow.value;
        } else {
          lineFlows.push(flow);
        }
      }, this);
      return lineFlows;
    },
    _onTopicHandler_hideMigrateCharts: function() {
      this._hideMigrate();
      this.graphicsLayer.clear();
      this._geoCoordData = {}; //各个点坐标
      this._geoNameData = {};

      this._markLineData = [];
      this._markPointData = [];
    },
    _onTopicHandler_showMigrateCharts: function(params) {
      this.graphicsLayer.clear();

      this._geoCoordData = {}; //各个点坐标
      this._geoNameData = {};

      this._markLineData = [];
      this._markPointData = [];
      this._PointIds = [];
      this._selectIds = [];
      this._inFlows = [];
      this._outFlows = [];
      if (params == "" || params == undefined || params == null) {
        this._hideMigrate();
      }

      this._zoom = params.zoom || -1;
      var flows = params.flows;
      var flowtype = params.type; //0为startid,1为endid,默认为endid

      this._flowType = flowtype;

      var qxIds = [];
      var pointFlows = [];

      var inPointFlows = [];
      var outPointFlows = [];

      var qxFlows = flows.map(function(flow) {
        var startid =
          flow.startid.toString().replace(/[0-9]/g, "") == ""
            ? flow.startid
            : flow.startid.toString().replace(/[0-9]/g, "");
        var endid =
          flow.endid.toString().replace(/[0-9]/g, "") == ""
            ? flow.endid
            : flow.endid.toString().replace(/[0-9]/g, "");

        pointFlows.push({
          name: flow.startid,
          type: 0,
          flow: flowtype,
          value: flow.value
        });
        pointFlows.push({
          name: flow.endid,
          type: 1,
          flow: flowtype,
          value: flow.value
        });

        inPointFlows.push({ name: endid, value: flow.value });
        outPointFlows.push({ name: startid, value: flow.value });

        return { startid: startid, endid: endid, value: flow.value };
      });
      var lineFlows = this.sumElement(qxFlows);
      this._markPointData = this.sumElement(pointFlows);

      this._inFlows = this.sumElement(inPointFlows);
      this._outFlows = this.sumElement(outPointFlows);

      lineFlows.forEach(function(flow) {
        this._markLineData.push([
          { name: flow.startid, type: 0 },
          {
            name: flow.endid,
            value: flow.value
          }
        ]);
        qxIds.push(flow.startid, flow.endid);
      }, this);

      this._queryXZQX(qxIds);
      this._selectIds = qxIds;

      var queryTask = new QueryTask(this.config.query.url);
      var query = new Query();
      query.returnGeometry = true;
      query.where = "1=1";
      query.outFields = ["*"];
      query.outSpatialReference = new SpatialReference(4326);
      queryTask.execute(
        query,
        lang.hitch(this, function(featureSet) {
          featureSet.features.forEach(function(graphic, index) {
            this._geoNameData[graphic.attributes[this._FeatureId]] =
              graphic.attributes[this._Name];
            this._geoCoordData[graphic.attributes[this._Name]] =
              graphic.geometry.type === "multipoint"
                ? graphic.geometry.points
                : [[graphic.geometry.x, graphic.geometry.y]];
            this._odColor = this.getColor(graphic);
            if (
              graphic.attributes[this.config.query.layer] == "火车站" ||
              graphic.attributes[this.config.query.layer] == "机场"
            ) {
              this._PointIds.push(graphic.attributes[this._FeatureId]);
              if (
                this._selectIds.length > 0 &&
                this._selectIds.indexOf(graphic.attributes[this._FeatureId]) >
                  -1
              ) {
                if (
                  this.config.zooms &&
                  this.config.zooms[graphic.attributes[this._Name]] !=
                    undefined &&
                  this.config.zooms[graphic.attributes[this._Name]] != null
                ) {
                  this._zoom = this.config.zooms[
                    graphic.attributes[this._Name]
                  ];
                }
                var centerPoint = this.config.center
                  ? this.config.center
                  : graphic.geometry;
                if (this._zoom > -1) {
                  this.map.centerAndZoom(centerPoint, this._zoom);
                } else {
                  this.map.centerAt(centerPoint);
                }
              }
            }
          }, this);

          this._setMigrateOption(false);
        }),
        function(error) {
          console.log(error);
        }
      );
    },
    _queryXZQX: function(ids) {
      var where = "";
      array.forEach(
        ids,
        function(id) {
          where += this.config.qx.id + "= '" + id + "' OR ";
        },
        this
      );
      //去掉最后的" OR "共四个字符
      where = where.substr(0, where.length - 4);

      var queryTask = new QueryTask(this.config.qx.url);
      var query = new Query();
      query.returnGeometry = true;
      query.where = where;
      query.outFields = ["*"];
      query.outSpatialReference = new SpatialReference(4326);
      queryTask.execute(
        query,
        lang.hitch(this, function(featureSet) {
          featureSet.features.forEach(function(graphic) {
            var gra = new Graphic(graphic.geometry);
            var linecolor = [255, 12, 12, 128];
            var color = [0, 255, 12, 0.3];
            var textGraphic;
            if (graphic.attributes[this.config.qx.layer] == "区县") {
              linecolor = [0, 100, 242, 128];
              color = [255, 255, 255, 0.4];
              textGraphic = new Graphic(
                graphic.geometry,
                new TextSymbol(graphic.attributes[this.config.qx.name])
                  .setColor(new Color([0, 0, 255]))
                  .setFont(this.fontFamily)
              );
            }
            gra.attributes = this._getFlowsByID(
              graphic.attributes[this._FeatureId]
            );
            var infoTemplate = new InfoTemplate(
              "a",
              "<div>进：${inFlow}车<br/>出：${outFlow}车</div>"
            );
            //gra.setInfoTemplate(infoTemplate);
            this.map.infoWindow.resize(130, 60);
            gra.symbol = new SimpleFillSymbol(
              SimpleFillSymbol.STYLE_SOLID,
              new SimpleLineSymbol(
                SimpleLineSymbol.STYLE_SOLID,
                new Color(linecolor),
                2
              ),
              new Color(color)
            );
            this.graphicsLayer.add(gra);
            if (textGraphic) {
              this.graphicsLayer.add(textGraphic);
            }
          }, this);
        }),
        function(error) {
          console.log(error);
        }
      );
    },
    _getFlowsByID: function(id) {
      var _in = 0;
      var _out = 0;
      this._inFlows.forEach(function(inflow) {
        if (inflow.name == id) {
          _in = inflow.value;
        }
      });

      this._outFlows.forEach(function(outflow) {
        if (outflow.name == id) {
          _out = outflow.value;
        }
      });
      return { inFlow: _in, outFlow: _out };
    },
    _setMigrateOption: function(effect) {
      var pointArr = [];
      var nameArr = [];
      var lineArr = [];
      for (var i = 0; i < this._markPointData.length; i++) {
        var pt = this._markPointData[i];
        if (this._PointIds.length > 0) {
          if (this._PointIds.indexOf(pt.name) > -1) {
            if (pt.flow != pt.type) {
              continue;
            }
          } else {
            if (pt.flow == pt.type) {
              continue;
            }
          }
        }
        pt.name =
          this._geoNameData[pt.name] === undefined
            ? pt.name
            : this._geoNameData[pt.name];
        if (pt.name !== undefined) {
          pointArr.push(pt);
        }
      }
      for (var i = 0; i < this._markLineData.length; i++) {
        var line = this._markLineData[i];
        if (this._PointIds.length > 0) {
          if (this._PointIds.indexOf(line[0].name) > -1) {
            line[0].type = 1;
          } else {
            line[0].type = 0;
          }
        }
        line[0].name =
          this._geoNameData[line[0].name] === undefined
            ? line[0].name
            : this._geoNameData[line[0].name];
        line[1].name =
          this._geoNameData[line[1].name] === undefined
            ? line[1].name
            : this._geoNameData[line[1].name];
        if (line[0].name !== undefined && line[1].name !== undefined) {
          lineArr.push(line);
        }
      }
      var r = 100;
      var markPointsColor = this.markPointColors;
      var position = this._flowType == 0 ? "end" : "start";
      var option = {
        color: ["gold", "aqua", "lime"],
        title: {
          text: "",
          subtext: "",
          x: "center",
          textStyle: {
            color: "#000"
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
          data: ["统计图"],
          textStyle: {
            color: "#000"
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
            name: "统计图",
            type: "map",
            mapType: "none",
            data: [],
            geoCoord: this._geoCoordData,
            label: {
              normal: {
                formatter: "{b}",
                position: "right",
                show: true
              },
              emphasis: {
                show: true
              }
            },
            markPoint: {
              symbol: "circle",
              symbolSize: function(v) {
                var r = v / 100 + 12;
                if (r > 25) {
                  r = 25;
                }
                return r;
              },
              effect: {
                show: effect, //动画事件
                shadowBlur: 0
              },
              itemStyle: {
                normal: {
                  label: {
                    show: true,
                    textStyle: {
                      color: "#ffffff",
                      fontSize: 15
                    }, //气泡中字体颜色
                    formatter: function(a) {
                      return a.value;
                    }
                  },
                  color: function(obj) {
                    var d = obj.data;
                    var level = 0;
                    if (d.value < 150) {
                      level = 0;
                    } else if (d.value < 500) {
                      level = 1;
                    } else if (d.value < 1000) {
                      level = 2;
                    } else {
                      level = 3;
                    }
                    return markPointsColor[level];
                  }
                },
                emphasis: {
                  label: { position: "top" }
                }
              },
              data: pointArr
            },
            markLine: {
              smooth: true,
              symbolSize: 1,
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
                      color = "#ff0000";
                    } else {
                      color = "#0181F8";
                    }
                    return color;
                  },
                  lineStyle: {
                    type: "solid",
                    shadowBlur: 1
                  },
                  label: {
                    show: true,
                    position: position, //inside,start,end
                    textStyle: {
                      color: function(obj) {
                        var d = obj.data;
                        var color = "red";
                        if (d[0].type == 1) {
                          color = "#00ffff";
                        } else {
                          color = "#0181F8";
                        }
                        return color;
                      },
                      fontSize: 15
                    },
                    formatter: function(a) {
                      return a.value;
                    }
                  },
                  labelLine: {
                    normal: {
                      show: true
                    }
                  },
                  emphasis: {
                    label: { position: "left" }
                  }
                }
              },
              data: lineArr
            }
          }
        ]
      };
      this._echartsOver.setOption(option);
    }
  });
});
