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
  "esri/symbols/SimpleFillSymbol",
  "esri/tasks/FindTask",
  "esri/tasks/FindParameters",
  "esri/tasks/QueryTask",
  "esri/tasks/query",
  "esri/Color",
  "esri/graphic"
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
  SimpleFillSymbol,
  FindTask,
  FindParameters,
  QueryTask,
  Query,
  Color,
  Graphic
) {
  var clazz = declare([BaseWidget], {
    name: "FindFeature",

    resultLayer: null,
    highlightLayer: null,
    defaultPointSymbol: null,
    defaultPolylineSymbol: null,
    defaultPolygonSymbol: null,
    defaultHighlightSymbol: null,

    _showResult: true,
    _showPopup: false,
    _centerResult: true,
    _alwaysHighlight: true,
    _callback: null,

    postCreate: function() {
      this.inherited(arguments);
      this.resultLayer = new GraphicsLayer();
      this.map.addLayer(this.resultLayer);

      this.highlightLayer = new GraphicsLayer();
      this.map.addLayer(this.highlightLayer);

      this.defaultPolylineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([0, 255, 255, 255]),
        4
      );
      this.defaultPolygonSymbol = new SimpleFillSymbol(
        SimpleFillSymbol.STYLE_SOLID,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          [0, 255, 255, 255],
          3
        ),
        new Color([0, 0, 0, 0])
      );
      this.defaultHighlightSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([0, 255, 255, 255]),
        4
      );

      topic.subscribe(
        "findFeature",
        lang.hitch(this, this.onTopicHandler_findFeature)
      );

      topic.subscribe(
        "startHighlightFeature",
        lang.hitch(this, this.onTopicHandler_startHighlightFeature)
      );

      topic.subscribe(
        "stopHighlightFeature",
        lang.hitch(this, this.onTopicHandler_stopHighlightFeature)
      );

      topic.subscribe(
        "findAllFeatureState",
        lang.hitch(this, this.onTopicHandler_findAllFeatureState)
      );
    },

    _doFindTask: function(url, ids, layerIds) {
      var deferredArray = [];
      var loading = new LoadingIndicator();
      loading.placeAt(window.jimuConfig.layoutId);

      array.forEach(ids, function(id) {
        var findTask = new FindTask(url);
        var findParam = new FindParameters();
        // findParam.searchFields = ["FEATUREID"];
        findParam.searchText = id;
        findParam.layerIds = layerIds;
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

                  if (this._callback) {
                    this._callback(graphic);
                  }
                  switch (graphic.geometry.type) {
                    case "polyline":
                      graphic.symbol = this.defaultPolylineSymbol;
                      break;
                    case "polygon":
                      graphic.symbol = this.defaultPolygonSymbol;
                      break;
                  }

                  this.resultLayer.add(graphic);

                  // if (this._showResult) {
                  //   var node = graphic.getNode();
                  //   node.setAttribute("data-highlight", "highlight");
                  //   setTimeout(function() {
                  //     node.setAttribute("data-highlight", "");
                  //   }, 5000);
                  // }
                  if (this._centerResult) {
                    switch (graphic.geometry.type) {
                      case "point":
                        this.map.centerAt(graphic.geometry);
                        break;

                      case "polygon":
                        this.map.setExtent(
                          graphic.geometry.getExtent().expand(2)
                        );
                        break;
                    }
                  }
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
      // console.log(graphicsLayer.mode, FeatureLayer.MODE_SNAPSHOT);
      graphicsLayer.graphics.forEach(function(graphic) {
        var attr = graphic.attributes;
        var id;
        for (var fieldName in attr) {
          if (attr.hasOwnProperty(fieldName)) {
            if (
              fieldName.indexOf("DEVICEID") > -1 ||
              fieldName.indexOf("BM_CODE") > -1 ||
              fieldName.indexOf("FEATUREID") > -1
            ) {
              id = attr[fieldName];
              console.log(id);
            }
          }
        }
        if (ids.indexOf(id) >= 0) {
          //把他放到最上层
          graphicsLayer.remove(graphic);
          graphicsLayer.add(graphic);

          if (this._callback) {
            this._callback(graphic);
          }
          if (this._showResult) {
            if (this._centerResult) {
              this.map
                .centerAt(jimuUtils.getGeometryCenter(graphic.geometry))
                .then(function(value) {
                  var node = graphic.getNode();
                  node.setAttribute("data-highlight", "highlight");
                  setTimeout(function() {
                    node.setAttribute("data-highlight", "");
                  }, 5000);
                });
            }

            if (this._showPopup) {
              this.map.infoWindow.setFeatures([graphic]);
              this.map.infoWindow.show(
                jimuUtils.getGeometryCenter(graphic.geometry)
              );
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
      this._showPopup = params.params.showPopup === true;

      this._callback = params.callback;

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
          this._doFindTask(layer.url, ids, layer.visibleLayers);
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
    },

    onTopicHandler_startHighlightFeature: function(params) {
      //高亮
      this.onTopicHandler_stopHighlightFeature({ layerName: params.layerName });

      this._startHighlightFeature(params);
    },
    _startHighlightFeature: function(params) {
      var layerName = params.layerName || "";
      var ids = params.ids || "";
      this._alwaysHighlight =
        params.always === undefined ? true : params.always;
      this._centerResult = params.centerResult === true;

      if (layerName === "" || ids === "") {
        return;
      }

      //this.highlightLayer.clear();
      //在DynamicService中查找
      for (var i = 0; i < this.map.layerIds.length; i++) {
        var layer = this.map.getLayer(this.map.layerIds[i]);
        //如果是Dynamic Service, 用FindTask查询服务中的所有图层
        if (
          layer.label === layerName &&
          layer instanceof ArcGISDynamicMapServiceLayer
        ) {
          this._doHighlightFindTask(
            layer.url,
            ids,
            layerName,
            layer.visibleLayers
          );
          return;
        }
      }

      //在FeatureLayer或GraphicsLayer中查找
      for (i = 0; i < this.map.graphicsLayerIds.length; i++) {
        layer = this.map.getLayer(this.map.graphicsLayerIds[i]);
        if (layer.label === layerName && layer instanceof FeatureLayer) {
          // this._doQueryTaskOnFeatureLayer(layer.url, ids);
          this._findInHighlightGraphicsLayer(layer, ids);
        }
      }
    },

    _doHighlightFindTask: function(url, ids, layerName, layerIds) {
      var deferredArray = [];

      array.forEach(ids, function(id) {
        var findTask = new FindTask(url);
        var findParam = new FindParameters();
        findParam.searchFields = ["DEVICEID", "BM_CODE", "FEATUREID"];
        findParam.searchText = id;
        findParam.layerIds = layerIds;
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
                  graphic.label = findResult.layerName;
                  graphic.id = findResult.value;
                  switch (graphic.geometry.type) {
                    case "polyline":
                      graphic.symbol = this.defaultHighlightSymbol;
                      break;
                    case "polygon":
                      graphic.symbol = this.defaultPolygonSymbol;
                      break;
                  }
                  this.highlightLayer.add(graphic);
                  var highlightLayer = this.highlightLayer;
                  switch (graphic.geometry.type) {
                    case "point":
                      this.map
                        .centerAt(jimuUtils.getGeometryCenter(graphic.geometry))
                        .then(function(value) {
                          this._doHighlightFeature(graphic);
                        });
                      break;
                    case "polyline":
                    case "polygon":
                      this._doHighlightFindTaskPolylineOrPolygon(graphic);
                      break;
                  }
                },
                this
              );
            },
            this
          );
        }),
        function(error) {
          console.log(error);
        }
      );
    },

    _findInHighlightGraphicsLayer: function(graphicsLayer, ids) {
      var symbol = graphicsLayer.renderer
        ? graphicsLayer.renderer.symbol
        : null;
      graphicsLayer.graphics.forEach(function(graphic) {
        var attr = graphic.attributes;
        var id;
        for (var fieldName in attr) {
          if (attr.hasOwnProperty(fieldName)) {
            if (
              fieldName.indexOf("DEVICEID") > -1 ||
              fieldName.indexOf("BM_CODE") > -1 ||
              fieldName.indexOf("FEATUREID") > -1
            ) {
              id = attr[fieldName];
            }
          }
        }
        if (ids.indexOf(id) >= 0) {
          var highlightgraphic = new Graphic(graphic.toJson());
          highlightgraphic.id = id;
          highlightgraphic.label = graphic.getLayer().label;
          switch (highlightgraphic.geometry.type) {
            case "polyline":
              highlightgraphic.symbol = this.defaultHighlightSymbol;
              break;
            case "polygon":
              highlightgraphic.symbol = this.defaultPolygonSymbol;
              break;
          }
          this.highlightLayer.add(highlightgraphic);
          switch (highlightgraphic.geometry.type) {
            case "point":
              if (symbol) {
                highlightgraphic.symbol = symbol;
              }
              this.map
                .centerAt(
                  jimuUtils.getGeometryCenter(highlightgraphic.geometry)
                )
                .then(
                  lang.hitch(this, function(value) {
                    this._doHighlightFeature(highlightgraphic);
                  })
                );
              break;
            case "polyline":
            case "polygon":
              this._doHighlightFindTaskPolylineOrPolygon(highlightgraphic);
              break;
          }
        }
      }, this);
    },
    _doHighlightFindTaskPolylineOrPolygon: function(graphic) {
      //graphic.attributes.showZoom="7";
      var showZoom = null;
      if (this.config) {
        for (var i = 0; i < this.config.length; i++) {
          if (graphic.label === this.config[i].label) {
            showZoom = Number(this.config[i].showzoom);
            break;
          }
        }
      }
      if (showZoom && showZoom > 0) {
        this.map
          .centerAndZoom(
            jimuUtils.getGeometryCenter(graphic.geometry),
            showZoom
          )
          .then(
            lang.hitch(this, function(value) {
              this._doHighlightFeature(graphic);
            })
          );
      } else {
        if (this._centerResult) {
          this.map.centerAt(jimuUtils.getGeometryCenter(graphic.geometry)).then(
            lang.hitch(this, function(value) {
              this.map.setExtent(graphic.geometry.getExtent().expand(2)).then(
                lang.hitch(this, function(value) {
                  this._doHighlightFeature(graphic);
                })
              );
            })
          );
        } else {
          this._doHighlightFeature(graphic);
        }
      }
    },
    _doHighlightFeature: function(graphic) {
      var node = graphic.getNode();
      var highlightLayer = this.highlightLayer;
      if (this._alwaysHighlight) {
        node.setAttribute("data-highlight", "always-highlight");
      } else {
        node.setAttribute("data-highlight", "highlight");
        setTimeout(function() {
          node.setAttribute("data-highlight", "");
          highlightLayer.clear();
        }, 5000);
      }
    },
    onTopicHandler_stopHighlightFeature: function(params) {
      //停止高亮
      var layerName = params.layerName || "";
      var ids = params.ids || "";
      var removeGraphics = [];
      this.highlightLayer.graphics.forEach(function(graphic) {
        var attr = graphic.attributes;
        var id;
        if (layerName === graphic.label) {
          for (var fieldName in attr) {
            if (attr.hasOwnProperty(fieldName)) {
              if (
                fieldName.indexOf("DEVICEID") > -1 ||
                fieldName.indexOf("BM_CODE") > -1 ||
                fieldName.indexOf("FEATUREID") > -1
              ) {
                id = attr[fieldName];
              }
            }
          }
          if (ids === "" || ids.indexOf(id) >= 0) {
            var node = graphic.getNode();
            if (node) {
              node.setAttribute("data-highlight", "");
            }
            removeGraphics.push(graphic);
          }
        }
      }, this);
      for (var i = 0; i < removeGraphics.length; i++) {
        this.highlightLayer.remove(removeGraphics[i]);
      }
    },
    onTopicHandler_findAllFeatureState: function(params) {
      var layerName = params.params.layerName || "";
      var idStates = params.params.idStates || [];
      this._centerResult = params.params.centerResult === true;
      this._showPopup = params.params.showPopup === true;

      this._callback = params.callback;

      if (layerName === "" || idStates.length == 0) {
        this.resultLayer.clear();
        return;
      }

      var layer;

      //在FeatureLayer或GraphicsLayer中查找
      for (i = 0; i < this.map.graphicsLayerIds.length; i++) {
        layer = this.map.getLayer(this.map.graphicsLayerIds[i]);
        if (layer.label === layerName && layer instanceof FeatureLayer) {
          this.resultLayer.setRenderer(layer.renderer);
          this._doQueryTaskOnFeatureLayerStates(layer.url, idStates);
        }
      }
    },
    _doQueryTaskOnFeatureLayerStates: function(url, idStates) {
      var where = "";
      array.forEach(idStates, function(idstate) {
        where += "FEATUREID = '" + idstate.id + "' OR ";
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
            var attributeField = this.resultLayer.renderer.attributeField;
            array.forEach(idStates, function(idstate) {
              var id = idstate.id;
              var state = idstate.state;
              for (var field in graphic.attributes) {
                if (field.indexOf("FEATUREID") > -1) {
                  if (graphic.attributes[field] === id) {
                    graphic.attributes[attributeField] = state;
                    break;
                  }
                }
              }
            });
            this.resultLayer.add(graphic);
            if (this._centerResult) {
              this.map.centerAt(jimuUtils.getGeometryCenter(graphic.geometry));
            }
          }, this);
        }),
        function(error) {}
      );
    }
  });

  return clazz;
});
