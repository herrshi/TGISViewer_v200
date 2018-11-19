define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/_base/xhr",
  "jimu/BaseWidget",
  "esri/geometry/Point",
  "esri/layers/FeatureLayer",
  "esri/layers/ArcGISDynamicMapServiceLayer",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/renderers/SimpleRenderer",
  "esri/Color",
  "esri/layers/GraphicsLayer",
  "esri/graphic",
  "esri/tasks/query",
  "esri/tasks/QueryTask",
  "jimu/CustomLayers/ChartInfoWindow",
  "dojo/dom-construct",
  "dojo/_base/window",
  "dojo/domReady!"
], function(
  declare,
  lang,
  array,
  topic,
  xhr,
  BaseWidget,
  Point,
  FeatureLayer,
  ArcGISDynamicMapServiceLayer,
  SimpleLineSymbol,
  SimpleFillSymbol,
  SimpleRenderer,
  Color,
  GraphicsLayer,
  Graphic,
  Query,
  QueryTask,
  ChartInfoWindow,
  domConstruct,
  win
) {
  return declare([BaseWidget], {
    //读取一个feature图层
    chartData: [],
    chartField: null,
    _results: null,
    colors: [[0, 255, 255], [255, 215, 0]],
    _timeInterval: null,
    _stack: "nomal",
    _selectID: null,
    _idField: null,
    _label: null,
    postCreate: function() {
      this.inherited(arguments);

      topic.subscribe(
        "showChartInfo",
        lang.hitch(this, this._onTopicHandler_showChartInfo)
      );
      this.map.on("click", lang.hitch(this, this._onChartLayerClick));
    },
    _onChartLayerClick: function(event) {
      if (event.graphic) {
        var label = event.graphic.getLayer().label;
        if (
          this._label !== null &&
          this._idField !== null &&
          this._label === label
        ) {
          var id = event.graphic.attributes[this._idField];
          this._onTopicHandler_showChartInfo({ label: label, id: id });
        } else {
          this._onTopicHandler_showChartInfo("");
        }
      } else {
        this._onTopicHandler_showChartInfo("");
      }
    },
    _onTopicHandler_showChartInfo: function(params) {
      //var label = params || "";
      this.clearChart();
      if (params === null || params === undefined || params === "") {
        this._clearInterval();
        return;
      }

      var label = params.label || "";
      this._label = label;
      this._selectID = params.id || "";

      if (this._timeInterval) {
        this._clearInterval();
      }

      this._timeInterval = setInterval(
        lang.hitch(this, this._resetData),
        this.config.interval
      );

      for (var i = 0; i < this.config.chartinfos.length; i++) {
        var chartinfo = this.config.chartinfos[i];
        if (chartinfo.label === label) {
          this._queryUrl = chartinfo.url;
          this.chartField = chartinfo.fields;
          this._stack = chartinfo.stacking;
          this._idField = chartinfo.idField;
          break;
        }
      }
      this._selectData(this._queryUrl);
    },
    _selectData: function(url) {
      var query = new Query();
      var queryTask = new QueryTask(url);
      query.where = "1=1";
      query.outSpatialReference = map.spatialReference;
      query.returnGeometry = true;
      query.outFields = ["*"];
      queryTask.execute(query, lang.hitch(this, this.processResults), error);
      function error(e) {
        alert(e.message);
      }
    },
    processResults: function(results) {
      this.clearChart();
      var width = 100;
      var height = 130;
      for (var i = 0; i < results.features.length; i++) {
        if (
          this._selectID === "*" ||
          (this._selectID != "" &&
            results.features[i].attributes[this._idField] == this._selectID)
        ) {
          var nodeChart = null;
          nodeChart = domConstruct.create(
            "div",
            {
              id: "nodeTest" + i,
              style: "width:" + width + "px;height:" + height + "px;"
            },
            win.body()
          );

          var seriesArr = [];
          for (var m = 0; m < this.chartField.length; m++) {
            var alph = this.chartField[m].alph;
            var datafield = this.chartField[m].dataField;
            var dataArr = [];
            for (var n = 0; n < datafield.length; n++) {
              var field = datafield[n];
              var data = {
                color: this.getRgbaColor(n, alph),
                y: Number(results.features[i].attributes[field])
              };
              dataArr.push(data);
            }
            seriesArr.push({ data: dataArr });
          }

          //柱状图
          var chart = new Highcharts.Chart({
            chart: {
              renderTo: "nodeTest" + i,
              backgroundColor: "rgba(0,0,0,0)",
              type: "column",
              options3d: {
                enabled: true,
                alpha: 20,
                beta: 10,
                depth: 50,
                viewDistance: 25
              }
            },
            title: {
              text: ""
            },
            subtitle: {
              text: ""
            },
            plotOptions: {
              column: {
                depth: 23, //纵深
                stacking: this._stack,
                colorByPoint: true,
                pointPadding: 0, //数据点之间的距离值
                groupPadding: 0, //分组之间的距离值
                pointWidth: 23, //柱子之间的距离值
                dataLabels: {
                  enabled: true, // dataLabels设为true
                  x: 0, //文本偏移
                  style: {
                    color: "#FFFFFF"
                  }
                }
              }
            },
            yAxis: {
              labels: {
                enabled: false
              },
              title: {
                enabled: false
              },
              gridLineWidth: 0,
              min: 0, // 这个用来控制y轴的开始刻度（最小刻度），另外还有一个表示最大刻度的max属性
              minRange: 1
            },
            xAxis: {
              labels: {
                enabled: false
              },
              gridLineWidth: 0
            },
            legend: {
              enabled: false
            },
            exporting: {
              enabled: false
            }, //隐藏导出
            credits: { enabled: false }, //隐藏右下角highcharts的链接
            series: seriesArr
          });
          var chartPoint = null;
          chartPoint = this.getCenter(results.features[i]);
          var chartInfo = new ChartInfoWindow({
            map: this.map,
            chart: nodeChart,
            chartPoint: chartPoint,
            width: width,
            height: height
          });
          this.chartData.push(chartInfo);
        }
      }
    },
    _resetData: function() {
      if (this._queryUrl) {
        console.log("interval");
        this._selectData(this._queryUrl);
      }
    },

    getCenter: function(gra) {
      var type = gra.geometry.type;
      var point;
      if (type == "point") {
        point = gra.geometry;
      } else if (type == "polyline") {
        point = gra.geometry.getPoint(0, 0);
      } else if (type == "polygon") {
        point = gra.geometry.getCentroid();
      } else if (type == "extent") {
        point = gra.geometry.getCenter();
      } else if (type == "multipoint") {
        point = gra.geometry.getPoint(0);
      }
      return point;
    },
    getRgbaColor: function(i, a) {
      //随机生成RGBA颜色
      var r, g, b;
      if (i < this.colors.length) {
        var color = this.colors[i];
        r = color[0];
        g = color[1];
        b = color[2];
      } else {
        r = Math.floor(Math.random() * 256);
        g = Math.floor(Math.random() * 256);
        b = Math.floor(Math.random() * 256);
      }
      return "rgba(" + r + "," + g + "," + b + ", " + a + ")"; //返回rgba(r,g,b,a)格式颜色
    },
    clearChart: function() {
      if (this.chartData) {
        for (var i = 0; i < this.chartData.length; i++) {
          var chart = this.chartData[i];
          chart.destroy();
        }
      }
      this.chartData = [];
    },
    _clearInterval: function() {
      console.log("clearInterval");
      clearInterval(this._timeInterval);
      this._timeInterval = null;
    }
  });
});
