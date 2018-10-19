define([
  "dojo/_base/declare",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/promise/all",
  "esri/graphic",
  "esri/geometry/Geometry",
  "esri/geometry/Point",
  "esri/geometry/Extent",
  "esri/geometry/Circle",
  "dojo/on",
  "dojo/_base/lang",
  "esri/Evented",
  "dojo/string",
  "dojo/dom",
  "dojo/dom-style",
  "dojo/dom-construct",
  "esri/domUtils",
  "esri/geometry/screenUtils",
  "jimu/BaseWidget",
  "jimu/dijit/LoadingIndicator",
  "esri/tasks/IdentifyTask",
  "esri/tasks/IdentifyParameters",
  "esri/layers/ArcGISDynamicMapServiceLayer",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/Color",
  "esri/tasks/query",
  "esri/tasks/QueryTask",
  "esri/tasks/FindTask",
  "esri/tasks/FindParameters",
  "esri/SpatialReference",
  "dojo/domReady!"
], function(
  declare,
  array,
  topic,
  all,
  Graphic,
  Geometry,
  Point,
  Extent,
  Circle,
  on,
  lang,
  Evented,
  string,
  dom,
  domStyle,
  domConstruct,
  domUtils,
  screenUtils,
  BaseWidget,
  LoadingIndicator,
  IdentifyTask,
  IdentifyParameters,
  ArcGISDynamicMapServiceLayer,
  FeatureLayer,
  GraphicsLayer,
  SimpleFillSymbol,
  SimpleMarkerSymbol,
  SimpleLineSymbol,
  Color,
  Query,
  QueryTask,
  FindTask,
  FindParameters,
  SpatialReference
) {
  return declare([BaseWidget], {
    _text: null,
    _node: null, ///todo,添加nodes
    _mapPoint: null,
    _layer: null,
    _width: null,
    _height: null,
    _offsetX: null,
    _offsetY: null,
    _offset: 30,
    _place: "right",
    _iconOffsetX: 0,
    _iconOffsetY: 0,
    _label: null,
    _hightlightLayer: null,
    _timeOut: null,
    _url: null,
    _showToolTip: true,
    _FindIds: [],
    _LayerScale: [],
    _queryId: null,
    _toolGra: null,
    postCreate: function() {
      this.inherited(arguments);
      this.map.on("click", lang.hitch(this, this._onLayerClick));
      this._hightlightLayer = new GraphicsLayer();
      this.map.addLayer(this._hightlightLayer);

      topic.subscribe(
        "findAndToolTip",
        lang.hitch(this, this._onTopicHandler_findAndToolTip)
      );
    },
    _onTopicHandler_findAndToolTip: function(params) {
      this._mapPoint = null;
      this._FindIds = [];
      this._LayerScale = [];
      if (this._node) {
        domConstruct.destroy(this._node);
      }
      var layerName = params.layerName || "";
      var texts = params.text || "";

      if (layerName === "" || texts === "") {
        return;
      }
      this._label = params.layerName;
      //在DynamicService中查找
      for (var i = 0; i < this.map.layerIds.length; i++) {
        var layer = this.map.getLayer(this.map.layerIds[i]);
        //如果是Dynamic Service, 用FindTask查询服务中的所有图层
        if (
          layer.label === layerName &&
          layer instanceof ArcGISDynamicMapServiceLayer
        ) {
          for (var i = 0; i < layer.layerInfos.length; i++) {
            var layeritem = layer.layerInfos[i];
            this._FindIds.push(layeritem.id);
            if (layeritem.parentLayerId == -1) {
              this._LayerScale.push({
                minScale: layeritem.minScale,
                maxScale: layeritem.maxScale,
                id: layeritem.id
              });
            } else {
              var parentLayer = layer.layerInfos[layeritem.parentLayerId];
              this._LayerScale.push({
                minScale:
                  layeritem.minScale > parentLayer.minScale
                    ? layeritem.minScale
                    : parentLayer.minScale,
                maxScale:
                  layeritem.maxScale > parentLayer.maxScale
                    ? layeritem.maxScale
                    : parentLayer.maxScale,
                id: layeritem.id
              });
            }
          }
          this._doFindTask(layer.url, texts);
          return;
        }
      }

      //在FeatureLayer或GraphicsLayer中查找
      for (i = 0; i < this.map.graphicsLayerIds.length; i++) {
        layer = this.map.getLayer(this.map.graphicsLayerIds[i]);
        if (layer.label === layerName && layer instanceof FeatureLayer) {
          this._queryId = layer.layerId;
          this._LayerScale.push({
            minScale: layer.minScale,
            maxScale: layer.maxScale,
            id: layer.layerId
          });
          this._findInGraphicsLayer(layer, texts);
          ///TODO,ceshi
        }
      }
    },
    _doFindTask: function(url, texts) {
      var deferredArray = [];
      var loading = new LoadingIndicator();
      loading.placeAt(window.jimuConfig.layoutId);
      this._url = url;
      var layerids = this._FindIds;
      array.forEach(texts, function(text) {
        var findTask = new FindTask(url);
        var findParam = new FindParameters();
        findParam.searchText = text;
        findParam.layerIds = layerids;
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
                  this._queryFeature(graphic, findResult.layerId, true);
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
    _findInGraphicsLayer: function(graphicsLayer, ids) {
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
          this._label = graphic.getLayer().label;
          this.setView(graphic);
        }
      }, this);
    },
    init: function() {
      if (this._mapPoint) {
        this.drawText();
        this._onEvent();
      }
    },
    _onLayerClick: function(event) {
      if (this._node) {
        domConstruct.destroy(this._node);
      }
      this._mapPoint = event.mapPoint;
      if (event.graphic) {
        this._label = event.graphic.getLayer().label;
        this.setContext(event.graphic);
      } else {
        array.forEach(
          this.map.layerIds,
          function(layerId) {
            var layer = this.map.getLayer(layerId);
            if (
              layer instanceof ArcGISDynamicMapServiceLayer &&
              layer.visibleAtMapScale &&
              layer.visible
            ) {
              this._label = layer.label;
              this._url = layer.url;
              var layerUrl = layer.url;
              var identifyTask = new IdentifyTask(layerUrl);
              var identifyParam = new IdentifyParameters();
              identifyParam.width = this.map.width;
              identifyParam.height = this.map.height;
              identifyParam.mapExtent = this.map.extent;
              identifyParam.returnGeometry = true;
              identifyParam.returnFieldName = true;
              identifyParam.layerOption =
                IdentifyParameters.LAYER_OPTION_VISIBLE;
              identifyParam.tolerance = 3;
              identifyParam.geometry = event.mapPoint;
              // identifyParam.geometry = (this.map.spatialReference.isWebMercator() ? webMercatorUtils.webMercatorToGeographic(event.mapPoint) : event.mapPoint);
              identifyTask.execute(identifyParam).then(
                lang.hitch(this, function(identifyResults) {
                  if (identifyResults.length > 0) {
                    var feature = identifyResults[0].feature;

                    this._queryFeature(
                      feature,
                      identifyResults[0].layerId,
                      false
                    );
                  }
                }),
                function(error) {
                  console.log(error);
                }
              );
            }
          },
          this
        );
      }
    },
    _queryFeature: function(feature, layerid, isFind) {
      this._queryId = layerid;
      var queryTask = new QueryTask(this._url + "/" + layerid);
      var query = new Query();
      query.outFields = ["*"];
      query.returnGeometry = true;
      query.geometry = feature.geometry;
      //query.outSpatialReference=new SpatialReference({ "wkid": 3857 });
      query.spatialRelationship = Query.SPATIAL_REL_WITHIN;
      queryTask.execute(
        query,
        lang.hitch(this, function(featureSet) {
          if (featureSet.features.length > 0) {
            var graphic = featureSet.features[0];

            if (isFind) {
              this.setView(graphic);
            } else {
              this.setContext(graphic);
            }
          }
        })
      );
    },
    setView: function(graphic) {
      var id = this._queryId;
      this._toolGra = graphic;
      for (var i = 0; i < this._LayerScale.length; i++) {
        var minscale = 0,
          maxscale = 0;
        if (id === this._LayerScale[i].id) {
          minscale = this._LayerScale[i].minScale;
          maxscale = this._LayerScale[i].maxScale;

          var scale = minscale > maxscale ? minscale : maxscale;
          var sc = 0;
          var lods = this.map.__tileInfo.lods;
          if (scale > 0) {
            for (var j = 0; j < lods.length; j++) {
              if (scale > lods[j].scale) {
                break;
              } else {
                sc = lods[j].scale;
              }
            }
          }
          if (this._mapPoint == null) {
            this._mapPoint = this.getCenter(graphic);
          }
          if (sc > 0) {
            this.map.setScale(sc).then(
              lang.hitch(this, function() {
                this.map.centerAt(this._mapPoint).then(
                  lang.hitch(this, function() {
                    this.setContext(this._toolGra);
                  })
                );
              })
            );
          } else {
            this.map.setExtent(graphic.geometry.getExtent().expand(2)).then(
              lang.hitch(this, function() {
                  this.setContext(this._toolGra);
              })
            );
          }
        }
      }
    },
    setContext: function(graphic) {
      if (this._mapPoint == null) {
        this._mapPoint = this.getCenter(graphic);
      }
      if (
        graphic.geometry.type == "polyline" ||
        graphic.geometry.type == "extent" ||
        graphic.geometry.type == "polygon"
      ) {
        var selectionSymbol;
        if (graphic.geometry.type == "polyline") {
          selectionSymbol = new SimpleLineSymbol(
            SimpleLineSymbol.STYLE_DASH,
            new Color([0, 255, 255]),
            5
          );
        } else {
          selectionSymbol = new SimpleFillSymbol(
            SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(
              SimpleLineSymbol.STYLE_DASH,
              new Color([0, 255, 255]),
              3
            ),
            new Color([0, 0, 0, 0])
          );
        }
        var layer = this._hightlightLayer;
        /*
            if (this._timeOut) {
              layer.clear();
              clearTimeout(this._timeOut);
            }
            */
        var hlGra = new Graphic(graphic.geometry, selectionSymbol);
        this._hightlightLayer.add(hlGra);
        var node = hlGra.getNode();
        node.setAttribute("data-highlight", "highlight");

        this._timeOut = setTimeout(function() {
          layer.remove(hlGra);
        }, 4000);
      }
      var label = this._label;
      var context;
      for (var i = 0; i < this.config.tooltips.length; i++) {
        var tooltip = this.config.tooltips[i];
        if (tooltip.label === label) {
          context = tooltip.context;
          if (tooltip.offsetx) {
            this._iconOffsetX = tooltip.offsetx;
          }
          if (tooltip.offsety) {
            this._iconOffsetY = tooltip.offsety;
          }
          break;
        }
      }
      if (context === undefined) {
        return;
      }
      context = context.replace(/\./g, "_");
      var contextObj = {};
      for (var field in graphic.attributes) {
        contextObj[
          field
            .toString()
            .replace(/\./g, "_")
            .toString()
        ] =
          graphic.attributes[field] == null ? "" : graphic.attributes[field];
      }
      var text = string.substitute(context, contextObj);
      var divClass = this._place == "top" ? "TextTriTop" : "TextTriRight";
      if (text.toString().indexOf("</") > -1) {
        this._node = text;
      } else {
        text = text.replace(/\n/g, "<br/>");
        this._node = domConstruct.toDom(
          "<div class='MapText TextDiv'><span>" +
            text +
            "</span><div class='" +
            divClass +
            "'></div></div>"
        );
      }
      this.init();
    },
    getCenter: function(gra) {
      var type = gra.geometry.type;
      var point;
      if (type == "point") {
        point = gra.geometry;
      } else if (type == "polyline") {
        var pointIndex = Math.floor(gra.geometry.paths[0].length / 2);
        point = gra.geometry.getPoint(0, pointIndex);
      } else if (type == "polygon") {
        point = gra.geometry.getCentroid();
      } else if (type == "extent") {
        point = gra.geometry.getCenter();
      } else if (type == "multipoint") {
        point = gra.geometry.getPoint(0);
      }
      return point;
    },
    _onEvent: function() {
      this.map.on("pan", lang.hitch(this, this._panEvent));
      this.map.on("zoom-start", lang.hitch(this, this._zoomStartEvent));
      this.map.on("zoom-end", lang.hitch(this, this._zoomEvent));
      //on(this.map, "zoom", lang.hitch(this, this._zoomEvent));
    },
    _panEvent: function(e) {
      this.panchangeText(e);
    },
    _zoomStartEvent: function(e) {
      this._hide();
    },
    _zoomEvent: function(e) {
      this.zoomchangeText(e);
      this._show();
    },
    hide: function() {
      this._hide();
    },
    _hide: function() {
      domUtils.hide(this._node);
    },
    show: function() {
      this._show();
    },
    _show: function() {
      if (this._node) {
        domUtils.show(this._node);
      }
    },
    getScreentPoint: function() {
      var screenPoint;
      if (this._mapPoint) {
        //screenPoint = this.map.toScreen(this._mapPoint);
        screenPoint = screenUtils.toScreenPoint(
          this.map.extent,
          this.map.width,
          this.map.height,
          this._mapPoint
        );
      }
      return screenPoint;
    },
    drawText: function() {
      var ss = this.map.root; //this._layer.container;//dom.byId(this._gl.id);
      ss.appendChild(this._node);

      var xy = this.getScreentPoint();

      this._width = this._node.offsetWidth;
      this._height = this._node.offsetHeight;
      this.setOffset();

      domStyle.set(this._node, {
        left: xy.x + this._offsetX + this._iconOffsetX + "px",
        top: xy.y + this._offsetY + this._iconOffsetY + "px",
        position: "absolute"
      });
    },
    setOffset: function() {
      if (this._place == "top") {
        this._offsetX = 0 - this._width / 2;
        this._offsetY = 0 - this._height - this._offset;
      } else if (this._place == "bottom") {
        this._offsetX = 0 - this._width / 2;
        this._offsetY = this._offset;
      } else if (this._place == "left") {
        this._offsetX = 0 - this._width - this._offset;
        this._offsetY = 0 - this._height / 2;
      } else if (this._place == "right") {
        this._offsetX = this._offset;
        this._offsetY = 0 - this._height / 2;
      } else if (this._place == "top_left") {
        this._offsetX = 0 - this._width - this._offset;
        this._offsetY = 0 - this._height - this._offset;
      } else if (this._place == "top_right") {
        this._offsetX = this._offset;
        this._offsetY = 0 - this._height - this._offset;
      } else if (this._place == "bottom_left") {
        this._offsetX = 0 - this._width - this._offset;
        this._offsetY = this._offset;
      } else if (this._place == "bottom_right") {
        this._offsetX = this._offset;
        this._offsetY = this._offset;
      }
    },
    panchangeText: function(e) {
      var dx = e.delta.x;
      var dy = e.delta.y;
      var dd = this.getScreentPoint();
      domStyle.set(this._node, {
        left: dd.x + dx + this._offsetX + "px",
        top: dd.y + dy + this._offsetY + "px"
      });
    },
    zoomchangeText: function(e) {
      if (this._node) {
        var dx = e.anchor.x;
        var dy = e.anchor.y;
        var dd = this.getScreentPoint();
        domStyle.set(this._node, {
          left: dd.x + this._offsetX + "px",
          top: dd.y + this._offsetY + "px"
        });
      }
    },
    clear: function() {
      domConstruct.destroy(this._node);
    },
    startup: function() {}
  });
});
