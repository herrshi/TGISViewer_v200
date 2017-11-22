define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/dom-class",
  "dojo/dom-style",
  "dojo/dom-construct",
  "dojo/topic",
  "dojo/on",
  "dojo/Deferred",
  "dojox/charting/Chart",
  "dojox/charting/plot2d/Pie",
  "dojox/charting/action2d/Highlight",
  "dojox/charting/action2d/MoveSlice",
  "dojox/charting/action2d/Tooltip",
  "dojox/charting/themes/MiamiNice",
  "jimu/BaseWidget",
  "jimu/utils",
  "esri/tasks/QueryTask",
  "esri/tasks/query",
  "esri/layers/GraphicsLayer",
  "esri/graphic",
  "esri/renderers/SimpleRenderer"
], function (declare,
             lang,
             array,
             domClass,
             domStyle,
             domConstruct,
             topic,
             on,
             Deferred,
             Chart,
             Pie,
             Highlight,
             MoveSlice,
             Tooltip,
             MiamiNice,
             BaseWidget,
             jimuUtils,
             QueryTask,
             Query,
             GraphicsLayer,
             Graphic,
             SimpleRenderer) {
  var clazz = declare([BaseWidget], {
    name: "RailwayStationFlow",
    baseClass: "jimu-widget-railway-station-flow",

    activeClass: "active",

    flowDatas: [],

    stationPoints: [],
    stationLayer: null,

    divHeight: 300,
    divWidth: 300,
    maxPieRadius: 80,
    minPieRadius: 40,

    postCreate: function () {
      this.stationLayer = new GraphicsLayer();
      this.map.addLayer(this.stationLayer);

      // this._queryRailwayStationPoint().then(lang.hitch(this, function (results) {
      //   this.railwayStationPoints = results;
      // }));

      topic.subscribe("showRailwayStationFlow", lang.hitch(this, this.onTopicHandler_showRailwayStationFlow));
      this.map.on("extent-change", lang.hitch(this, this.onMapHandler_extentChange));
    },

    onMapHandler_extentChange: function (event) {
      array.forEach(this.stationPoints, function (stationPoint) {
        var point = stationPoint.point;
        var screenPoint = this.map.toScreen(point);

        var div = stationPoint.div;
        domStyle.set(div, {
          // width: this.divWidth,
          // height: this.divHeight,
          left: (screenPoint.x - domStyle.get(div, "width") / 2) + "px",
          top: (screenPoint.y - domStyle.get(div, "height") / 2) + "px"
        });
      }, this);
    },

    _queryRailwayStationPoint: function () {
      var def = new Deferred();
      var stationPoints = [];
      var nameField = this.config.railwayStationNameField;

      var url = this.config.railwayStationUrl.replace(/{gisServer}/i, this.appConfig.gisServer);
      var query = new Query();
      query.where = "1=1";
      query.returnGeometry = true;
      query.outFields = ["*"];

      var queryTask = new QueryTask(url);
      queryTask.execute(query, lang.hitch(this, function (results) {
        array.forEach(results.features, function (feature) {
          var name = feature.attributes[nameField];
          var point = jimuUtils.getGeometryCenter(feature.geometry);

          var screenPoint = this.map.toScreen(point);

          var div = domConstruct.create("div", {
            id: name
          }, this.map.root);
          domStyle.set(div, {
            // width: this.divWidth + "px",
            // height: this.divHeight + "px",
            // left: (screenPoint.x - this.divWidth / 2) + "px",
            // top: (screenPoint.y - this.divHeight / 2) + "px",
            position: "absolute",
            display: "none"
          });

          stationPoints.push({
            name: name,
            point: point,
            div: div
          });
        }, this);

        def.resolve(stationPoints);
      }), function (error) {
        console.error(error);
        def.reject(error);
      });

      return def;
    },

    _getStationPoint: function (name) {
      for (var i = 0; i < this.stationPoints.length; i++) {
        var stationPoint = this.stationPoints[i];
        if (stationPoint.name === name) {
          return stationPoint;
        }
      }

      return null;
    },

    _getColor: function (type) {
      switch (type) {
        case "total":
          return [33, 126, 189, 150];

        case "in":
          return [50, 197, 210, 150];

        case "out":
          return [231, 80, 90, 150];
      }
    },

    _getRenderer: function (type, minFlow, maxFlow) {
      var color = this._getColor(type);
      return new SimpleRenderer({
        "type": "simple",
        "symbol": {
          "type": "esriSMS",
          "style": "esriSMSCircle",
          "color": color,
          "outline": {
            "color": [255, 255, 255],
            "width": 2
          }
        },
        "visualVariables": [
          {
            "type": "sizeInfo",
            "field": type,
            "minDataValue": minFlow,
            "maxDataValue": maxFlow,
            "minSize": {
              "type": "sizeInfo",
              "expression": "view.scale",
              "stops": [
                {
                  "value": 2000,
                  "size": 32
                },
                {
                  "value": 16000,
                  "size": 32
                },
                {
                  "value": 128000,
                  "size": 16
                },
                {
                  "value": 512000,
                  "size": 8
                }
              ]
            },
            "maxSize": {
              "type": "sizeInfo",
              "expression": "view.scale",
              "stops": [
                {
                  "value": 2000,
                  "size": 128
                },
                {
                  "value": 16000,
                  "size": 128
                },
                {
                  "value": 128000,
                  "size": 64
                },
                {
                  "value": 512000,
                  "size": 32
                }
              ]
            }
          }
        ]
      });
    },

    /**
     * 总流量: 在地图上叠加div, div中显示pieChart
     * 进出流量: 在地图上叠加graphic
     * */
    _showStationFlow: function (type) {
      this.stationLayer.clear();
      //隐藏chart
      array.forEach(this.stationPoints, function (stationPoint) {
        stationPoint.div.innerHTML = "";
        domStyle.set(stationPoint.div, {
          display: "none"
        });
      });

      var minFlow = Number.MAX_VALUE;
      var maxFlow = Number.MIN_VALUE;

      //先循环一遍算出最大最小值
      array.forEach(this.flowDatas, function (flowData) {
        minFlow = Math.min(flowData[type], minFlow);
        maxFlow = Math.max(flowData[type], maxFlow);
      });

      //如果显示进出流量
      if (type === "in" || type === "out") {
        var renderer = this._getRenderer(type, minFlow, maxFlow);
        this.stationLayer.setRenderer(renderer);
      }

      //再循环一遍加点
      array.forEach(this.flowDatas, function (flowData) {
        var stationPoint = this._getStationPoint(flowData.name);
        var div = stationPoint.div;

        switch (type) {
          case "total":
            var barRadius = (flowData[type] - minFlow) / (maxFlow - minFlow) * (this.maxPieRadius - this.minPieRadius) + this.minPieRadius;

            var chart = new Chart(div, {
              title: flowData.name,
              titleGap: -80
            });
            chart.setTheme(MiamiNice)
              .addPlot("default", {
                type: Pie,
                font: "normal normal 12pt Tahoma",
                fontColor: "black",
                // labelOffset: 50,
                radius: barRadius
              })
              .addSeries("Series A", [
                {y: flowData.in, color: this._getColor("in"), text: flowData.in, stroke: "black", tooltip: "进上海客流: <b>" + flowData.in + "</b>人"},
                {y: flowData.out, color: this._getColor("out"), text: flowData.out, stroke: "black", tooltip: "出上海客流: <b>" + flowData.out + "</b>人"}
              ]);
            var anim_a = new MoveSlice(chart, "default");
            var anim_b = new Highlight(chart, "default");
            var anim_c = new Tooltip(chart, "default");
            chart.render();
            chart.surface.rawNode.childNodes[1].setAttribute("fill-opacity", "0");
            chart.surface.rawNode.childNodes[2].setAttribute("stroke-opacity", "0");
            chart.surface.rawNode.childNodes[2].setAttribute("fill-opacity", "0");

            //显示chart

            domStyle.set(div, {
              display: "block"
            });

            var screenPoint = this.map.toScreen(stationPoint.point);
            domStyle.set(div, {
              left: (screenPoint.x - domStyle.get(div, "width") / 2) + "px",
              top: (screenPoint.y - domStyle.get(div, "height") / 2) + "px"
            });

            break;

          case "in":
          case "out":
            //显示graphic
            if (stationPoint.point !== null) {
              var stationGraphic = new Graphic(stationPoint.point);
              stationGraphic.attributes = flowData;
              this.stationLayer.add(stationGraphic);
            }
            break;
        }
      }, this);



    },

    onTopicHandler_showRailwayStationFlow: function (params) {
      this.flowDatas = params.flows;

      //计算总客流
      array.forEach(this.flowDatas, function (flow) {
        flow.total = flow.in + flow.out;
      });

      if (domClass.contains(this.btnAll, this.activeClass)) {
        if (this.stationPoints.length === 0) {
          this._queryRailwayStationPoint().then(lang.hitch(this, function (results) {
            this.stationPoints = results;
            this._showStationFlow("total");
          }));
        }
        else {
          this._showStationFlow("total");
        }
      }
      else if (domClass.contains(this.btnIn, this.activeClass)) {
        if (this.stationPoints.length === 0) {
          this._queryRailwayStationPoint().then(lang.hitch(this, function (results) {
            this.stationPoints = results;
            this._showStationFlow("in");
          }));
        }
        else {
          this._showStationFlow("in");
        }
      }
      else if (domClass.contains(this.btnOut, this.activeClass)) {
        if (this.stationPoints.length === 0) {
          this._queryRailwayStationPoint().then(lang.hitch(this, function (results) {
            this.stationPoints = results;
            this._showStationFlow("out");
          }));
        }
        else {
          this._showStationFlow("out");
        }
      }

    },

    _onBtnAllClick: function () {
      domClass.add(this.btnAll, this.activeClass);
      domClass.remove(this.btnIn, this.activeClass);
      domClass.remove(this.btnOut, this.activeClass);

      this._showStationFlow("total");
    },

    _onBtnInClick: function () {
      domClass.remove(this.btnAll, this.activeClass);
      domClass.add(this.btnIn, this.activeClass);
      domClass.remove(this.btnOut, this.activeClass);

      this._showStationFlow("in");
    },

    _onBtnOutClick: function () {
      domClass.remove(this.btnAll, this.activeClass);
      domClass.remove(this.btnIn, this.activeClass);
      domClass.add(this.btnOut, this.activeClass);

      this._showStationFlow("out");
    }
  });

  return clazz;
});