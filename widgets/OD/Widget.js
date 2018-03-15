define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "jimu/BaseWidget",
  "jimu/CustomLayers/ECharts3Layer"
], function (
  declare,
  lang,
  topic,
  BaseWidget,
  ECharts3Layer
) {
  return declare([BaseWidget], {
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
      var overlay = new ECharts3Layer(this.map, echarts);
      var chartContainer = overlay.getEchartsContainer();
      var myChart = overlay.initECharts(chartContainer);
    },

    _onTopicHandler_showOD: function () {
      var geoCoorMap = {
        "B11": [113.1279, 36.2036],
        "B12": [113.1164, 36.1715],
        "B13": [113.0906, 36.2137],
        "B14": [113.0926, 36.1474],
        "B15": [113.1204, 36.2741],
        "B17": [113.0790, 36.1828],
        "B18": [113.1412, 36.3409]
      };


    }
  });
});