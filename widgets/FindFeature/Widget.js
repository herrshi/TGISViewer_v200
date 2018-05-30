define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/promise/all",
  "jimu/BaseWidget",
  "jimu/utils",
  "jimu/dijit/LoadingIndicator",
  "esri/layers/GraphicsLayer",
  "esri/layers/ArcGISDynamicMapServiceLayer",
  "esri/layers/FeatureLayer",
  "esri/symbols/SimpleLineSymbol",
  "esri/tasks/FindTask",
  "esri/tasks/FindParameters",
  "esri/tasks/QueryTask",
  "esri/tasks/query",
  "esri/Color"
], function(
  declare,
  lang,
  array,
  topic,
  all,
  BaseWidget,
  jimuUtils,
  LoadingIndicator,
  GraphicsLayer,
  ArcGISDynamicMapServiceLayer,
  FeatureLayer,
  SimpleLineSymbol,
  FindTask,
  FindParameters,
  QueryTask,
  Query,
  Color
) {
  var clazz = declare([BaseWidget], {
    name: "FindFeature",

    resultLayer: null,
    defaultPointSymbol: null,
    defaultPolylineSymbol: null,
    defaultPolygonSymbol: null,

    _showResult: true,
    _centerResult: true,

    postCreate: function() {
      this.inherited(arguments);
      this.resultLayer = new GraphicsLayer();
      this.map.addLayer(this.resultLayer);

      this.defaultPolylineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([8, 146, 251, 255]),
        4
      );

      topic.subscribe(
        "findFeature",
        lang.hitch(this, this.onTopicHandler_findFeature)
      );
    },

    _doFindTask: function(url, ids) {
      var deferredArray = [];
      var loading = new LoadingIndicator();
      loading.placeAt(window.jimuConfig.layoutId);

      array.forEach(ids, function(id) {
        var findTask = new FindTask(url);
        var findParam = new FindParameters();
        findParam.searchFields = ["FEATUREID"];
        findParam.searchText = id;
        findParam.layerIds = [0];
        findParam.returnGeometry = true;
        deferredArray.push(findTask.execute(findParam));
      });
      all(deferredArray).then(
        lang.hitch(this, function(results) {
          array.forEach(
            results,
            function(result) {
              array.forEach(
                result,
                function(findResult) {
                  var graphic = findResult.feature;
                  switch (graphic.geometry.type) {
                    case "polyline":
                      graphic.symbol = this.defaultPolylineSymbol;
                      break;
                  }

                  this.resultLayer.add(graphic);
                },
                this
              );
            },
            this
          );
          loading.destroy();
        }),
        function(error) {
          console.log(error);
          loading.destroy();
        }
      );
    },

    _doQueryTaskOnFeatureLayer: function(url, ids) {
      var loading = new LoadingIndicator();
      loading.placeAt(window.jimuConfig.layoutId);

      var where = "";
      array.forEach(ids, function(id) {
        where += "FEATUREID = '" + id + "' OR ";
      });
      //去掉最后的" OR "共四个字符
      where = where.substr(0, where.length - 4);

      var queryTask = new QueryTask(url);
      var query = new Query();
      query.returnGeometry = true;
      query.where = where;
      query.outFields = ["*"];
      queryTask.execute(
        query,
        lang.hitch(this, function(featureSet) {
          featureSet.features.forEach(function(graphic) {
            if (this._showResult) {
              var node = graphic.getNode();
              node.setAttribute("data-highlight", "highlight");
              setTimeout(function() {
                node.setAttribute("data-highlight", "");
              }, 5000);
            }
            if (this._centerResult) {
              this.map.centerAt(jimuUtils.getGeometryCenter(graphic.geometry));
            }
          }, this);

          loading.destroy();
        }),
        function(error) {
          console.log(error);
          loading.destroy();
        }
      );
    },

    _findInGraphicsLayer: function(graphicsLayer, ids) {
      console.log(graphicsLayer.mode, FeatureLayer.MODE_SNAPSHOT);
      graphicsLayer.graphics.forEach(function (graphic) {
        var attr = graphic.attributes;
        var id;
        for (var fieldName in attr) {
          if (attr.hasOwnProperty(fieldName)) {
            if (fieldName.indexOf("DEVICEID") > -1 || fieldName.indexOf("BM_CODE") > -1 || fieldName.indexOf("FEATUREID") > -1) {
              id = attr[fieldName];
            }
          }
        }
        if (ids.indexOf(id) >= 0) {
          if (this._showResult) {
            if (this._centerResult) {
              this.map.centerAt(jimuUtils.getGeometryCenter(graphic.geometry)).then(function (value) {
                var node = graphic.getNode();
                node.setAttribute("data-highlight", "highlight");
                setTimeout(function() {
                  node.setAttribute("data-highlight", "");
                }, 5000);
              });
            }

          }
        }
      }, this);
    },

    onTopicHandler_findFeature: function(params) {
      var layerName = params.params.layerName || "";
      var ids = params.params.ids || "";
      this._showResult = params.params.showResult !== false;
      this._centerResult = params.params.centerResult === true;

      if (layerName === "" || ids === "") {
        return;
      }

      //在DynamicService中查找
      for (var i = 0; i < this.map.layerIds.length; i++) {
        var layer = this.map.getLayer(this.map.layerIds[i]);
        //如果是Dynamic Service, 用FindTask查询服务中的所有图层
        if (
          layer.label === layerName &&
          layer instanceof ArcGISDynamicMapServiceLayer
        ) {
          this._doFindTask(layer.url, ids);
          return;
        }
      }

      //在FeatureLayer或GraphicsLayer中查找
      for (i = 0; i < this.map.graphicsLayerIds.length; i++) {
        layer = this.map.getLayer(this.map.graphicsLayerIds[i]);
        if (layer.label === layerName && layer instanceof FeatureLayer) {
          // this._doQueryTaskOnFeatureLayer(layer.url, ids);
          this._findInGraphicsLayer(layer, ids);
        }
      }
    }
  });

  return clazz;
});
