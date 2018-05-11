/**
 * 公交线路和轨交线路客流量
 * */
define([
  "dojo/_base/lang",
  "dojo/_base/declare",
  "dojo/_base/array",
  "dojo/_base/html",
  "dojo/topic",
  "dojo/Deferred",
  "jimu/BaseWidget",
  "esri/Color",
  "esri/tasks/QueryTask",
  "esri/tasks/query",
  "esri/graphic",
  "esri/InfoTemplate",
  "esri/symbols/SimpleLineSymbol",
  "esri/layers/GraphicsLayer",
  "esri/renderers/SimpleRenderer",
  "esri/geometry/geometryEngineAsync"
], function(
  lang,
  declare,
  array,
  html,
  topic,
  Deferred,
  BaseWidget,
  Color,
  QueryTask,
  Query,
  Graphic,
  InfoTemplate,
  SimpleLineSymbol,
  GraphicsLayer,
  SimpleRenderer,
  geometryEngineAsync
) {
  return declare([BaseWidget], {
    name: "PublicTransportFlow",
    baseClass: "jimu-widget-public-transport-flow",

    busLineLayer: null,
    metroLineLayer: null,

    postCreate: function() {
      this.inherited(arguments);

      this.busLineLayer = new GraphicsLayer();
      this.map.addLayer(this.busLineLayer);

      this.metroLineLayer = new GraphicsLayer();
      this.metroLineLayer.setVisibility(false);
      this.map.addLayer(this.metroLineLayer);

      topic.subscribe(
        "setBusLineFlow",
        lang.hitch(this, this.onTopicHandler_setBusLineFlow)
      );
      topic.subscribe(
        "setMetroLineFlow",
        lang.hitch(this, this.onTopicHandler_setMetroLineFlow)
      );
    },

    _getBusLineGeometry: function(lineName) {
      var def = new Deferred();

      var layerUrl = this.config.busLineUrl.replace(
        /{gisServer}/i,
        this.appConfig.gisServer
      );

      var query = new Query();
      query.where = this.config.busLineNameField + "='" + lineName + "'";
      query.returnGeometry = true;
      query.outFields = ["*"];

      var queryTask = new QueryTask(layerUrl);
      queryTask.execute(
        query,
        lang.hitch(this, function(queryResults) {
          //公交线路图层是按照站点打断的, 要把查询结果合并
          var lineGeometries = array.map(queryResults.features, function(
            feature
          ) {
            return feature.geometry;
          });
          geometryEngineAsync.union(lineGeometries).then(
            function(unionedGeometry) {
              def.resolve(unionedGeometry);
            },
            function(error) {
              console.error(error);
              def.reject(error);
            }
          );
        }),
        function(error) {
          console.error(error);
          def.reject(error);
        }
      );

      return def;
    },

    _getMetroLineGeometry: function(lineName) {
      var def = new Deferred();

      var layerUrl = this.config.metroLineUrl.replace(
        /{gisServer}/i,
        this.appConfig.gisServer
      );

      var query = new Query();
      query.where = this.config.metroLineNameField + "='" + lineName + "'";
      query.returnGeometry = true;
      query.outFields = ["*"];

      var queryTask = new QueryTask(layerUrl);
      queryTask.execute(
        query,
        lang.hitch(this, function(queryResults) {
          //轨交线路图层是按照站点打断的, 要把查询结果合并
          var lineGeometries = array.map(queryResults.features, function(
            feature
          ) {
            return feature.geometry;
          });
          geometryEngineAsync.union(lineGeometries).then(
            function(unionedGeometry) {
              def.resolve(unionedGeometry);
            },
            function(error) {
              console.error(error);
              def.reject(error);
            }
          );
        }),
        function(error) {
          console.error(error);
          def.reject(error);
        }
      );

      return def;
    },

    onTopicHandler_setBusLineFlow: function(params) {
      this.busLineLayer.clear();

      var flows = params.flows;

      //先获取最大值和最小值
      var minValue = Number.MAX_VALUE;
      var maxValue = Number.MIN_VALUE;
      array.forEach(flows, function(flowData) {
        minValue = Math.min(minValue, flowData.flow);
        maxValue = Math.max(maxValue, flowData.flow);
      });

      var busLineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([231, 80, 90]),
        6
      );
      var renderer = new SimpleRenderer(busLineSymbol);
      renderer.setSizeInfo({
        field: "flow",
        minSize: 1,
        maxSize: 9,
        minDataValue: minValue,
        maxDataValue: maxValue
      });
      this.busLineLayer.setRenderer(renderer);

      array.forEach(
        flows,
        function(flowData) {
          var lineName = flowData.lineName;
          if (lineName !== null) {
            this._getBusLineGeometry(lineName).then(
              lang.hitch(this, function(geometry) {
                var busLineGraphic = new Graphic(geometry);
                busLineGraphic.attributes = {
                  flow: flowData.flow,
                  lineName: lineName
                };
                busLineGraphic.infoTemplate = new InfoTemplate(
                  "${lineName}",
                  "<b>客运量: </b>${flow}人"
                );
                this.busLineLayer.add(busLineGraphic);
              })
            );
          }
        },
        this
      );
    },

    onTopicHandler_setMetroLineFlow: function(params) {
      this.metroLineLayer.clear();

      var flows = params.flows;

      //先获取最大值和最小值
      var minValue = Number.MAX_VALUE;
      var maxValue = Number.MIN_VALUE;
      array.forEach(flows, function(flowData) {
        minValue = Math.min(minValue, flowData.flow);
        maxValue = Math.max(maxValue, flowData.flow);
      });

      var metroLineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([33, 126, 189]),
        6
      );
      var renderer = new SimpleRenderer(metroLineSymbol);
      renderer.setSizeInfo({
        field: "flow",
        minSize: 1,
        maxSize: 9,
        minDataValue: minValue,
        maxDataValue: maxValue
      });
      this.metroLineLayer.setRenderer(renderer);

      array.forEach(
        flows,
        function(flowData) {
          var lineName = flowData.lineName;
          if (lineName !== null) {
            this._getMetroLineGeometry(lineName).then(
              lang.hitch(this, function(geometry) {
                var metroLineGraphic = new Graphic(geometry);
                metroLineGraphic.attributes = {
                  flow: flowData.flow,
                  lineName: lineName
                };
                metroLineGraphic.infoTemplate = new InfoTemplate(
                  "${lineName}",
                  "<b>客运量: </b>${flow}人"
                );
                this.metroLineLayer.add(metroLineGraphic);
              })
            );
          }
        },
        this
      );
    },

    _onBtnBusClick: function(event) {
      html.addClass(this.btnBus, "active");
      html.removeClass(this.btnMetro, "active");

      this.busLineLayer.setVisibility(true);
      this.metroLineLayer.setVisibility(false);
    },

    _onBtnMetroClick: function(event) {
      html.removeClass(this.btnBus, "active");
      html.addClass(this.btnMetro, "active");

      this.busLineLayer.setVisibility(false);
      this.metroLineLayer.setVisibility(true);
    }
  });
});
