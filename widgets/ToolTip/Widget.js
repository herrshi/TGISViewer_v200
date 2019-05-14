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
  "esri/geometry/webMercatorUtils",
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
  SpatialReference,
  webMercatorUtils
) {
  return declare([BaseWidget], {
    _text: null,
    _node: null,
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
    _timeOut2: null,
    _url: null,
    _showToolTip: true,
    _FindIds: [],
    _LayerScale: [],
    _queryId: null,
    _toolGra: null,
    _selectcolor: null, //"red",[0,0,0,0]
    _isexpand: null, //true,false
    _scale: null, //"scales":[{"layerid":0,"scale":2257}]
    _joinField: null, //判断关联字段,如果为空这不显示tooltip;
    _first: true,
    _isClick: true,
    _clickhand: null,
    _tooltipNodes: [],
    postCreate: function() {
      this.inherited(arguments);

      this._hightlightLayer = new GraphicsLayer();
      this.map.addLayer(this._hightlightLayer);

      topic.subscribe(
        "findAndToolTip",
        lang.hitch(this, this._onTopicHandler_findAndToolTip)
      );
      topic.subscribe(
        "showToolTip",
        lang.hitch(this, this._onTopicHandler_showToolTip)
      );
      topic.subscribe(
        "clearToolTip",
        lang.hitch(this, this._onTopicHandler_clearToolTip)
      );
    },
    _onTopicHandler_findAndToolTip: function(params) {
      if (this._clickhand) {
        this._clickhand = this.map.on(
          "click",
          lang.hitch(this, this._onLayerClick)
        );
      }
      this._mapPoint = null;
      this._FindIds = [];
      this._LayerScale = [];
      this._isClick = false;
      this.clear();
      var layerName = params.layerName || "";
      var texts = params.text || "";

      if (layerName === "" || texts === "") {
        return;
      }

      this._label = params.layerName;
      var scales = [];
      for (var i = 0; i < this.config.tooltips.length; i++) {
        var tooltip = this.config.tooltips[i];
        if (tooltip.label === this._label) {
          this._isexpand = tooltip.isexpand;
          this._selectcolor = tooltip.selectcolor;
          this._joinField = tooltip.joinfield;
          scales = tooltip.scales;
          break;
        }
      }
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
            this._scale = this.getScales(layeritem.id, scales);

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
          this._scale = this.getScales(layer.layerId, scales);
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
        findParam.contains = false;
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
                  this._queryFeature(
                    graphic,
                    findResult.layerId,
                    true,
                    0,
                    null
                  );
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
              fieldName.indexOf("SECTIONID") > -1 ||
              fieldName.indexOf("FEATUREID") > -1
            ) {
              id = attr[fieldName];
              //console.log(id);
              if (ids.indexOf(id) >= 0) {
                break;
              }
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
        this._tooltipNodes.push({
          node: this._node,
          mapPoint: this._mapPoint,
          offsetX: this._offsetX,
          offsetY: this._offsetY
        });
        if (this._first) {
          this._first = false;
          this._onEvent();
        }
      }
    },
    _onLayerClick: function(event) {
      $(".MapText").remove();
      this._node = null;
      this._isClick = true;
      this._mapPoint = event.mapPoint;
      if (event.graphic) {
        this._label = event.graphic.getLayer().label;
        this._url = event.graphic.getLayer().url;
        if (
          event.graphic.geometry.type == "point" ||
          event.graphic.geometry.type == "multipoint"
        ) {
          this._queryFeature(event.graphic, -1, false, 0, event.graphic);
        } else if (event.graphic.geometry.type == "polyline") {
          this._queryFeature(
            new Graphic(event.mapPoint),
            -2,
            false,
            12,
            event.graphic
          );
        } else {
          this._queryFeature(
            new Graphic(event.mapPoint),
            -3,
            false,
            0,
            event.graphic
          );
        }
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
                      false,
                      0,
                      null
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
    _queryFeature: function(feature, layerid, isFind, rad, gra) {
      this._queryId = layerid;
      var url = layerid < 0 ? this._url : this._url + "/" + layerid;
      var queryTask = new QueryTask(url);
      var query = new Query();
      query.outFields = ["*"];
      query.returnGeometry = true;
      query.geometry = feature.geometry;
      if (layerid == -2) {
        query.geometry = new Circle(feature.geometry, { radius: rad });
      }
      if (layerid == -3) {
        query.geometry = feature.geometry;
      }
      //query.outSpatialReference=new SpatialReference({ "wkid": 102100 });
      //layerid小于0的时候,为点击弹出框
      query.spatialRelationship =
        layerid < 0 ? Query.SPATIAL_REL_INTERSECTS : Query.SPATIAL_REL_WITHIN; // Query.SPATIAL_REL_INTERSECTS;SPATIAL_REL_OVERLAPS;SPATIAL_REL_WITHIN
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
          } else {
            if (featureSet.features.length == 0 && gra != null && layerid < 0) {
              this.setContext(gra);
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
        var curscale = this.map.getScale();
        if (id === this._LayerScale[i].id) {
          minscale = this._LayerScale[i].minScale;
          maxscale = this._LayerScale[i].maxScale;

          var scale = 0;

          var lods = this.map.__tileInfo.lods;
          var sc = 0;
          if (this._scale > 0) {
            sc = this._scale;
          } else {
            if (minscale == 0 && maxscale == 0) {
              scale = 0;
              sc = 0;
            } else {
              if (minscale > 0 && curscale < minscale) {
                scale = curscale;
                sc = curscale;
              } else {
                scale = minscale;
                for (var j = 0; j < lods.length; j++) {
                  if (scale >= lods[j].scale) {
                    sc = lods[j].scale;
                    break;
                  } else {
                    sc = lods[j].scale;
                  }
                }
              }
              if (maxscale > 0) {
                scale = maxscale;
                for (var j = 0; j < lods.length; j++) {
                  if (scale >= lods[j].scale) {
                    break;
                  } else {
                    sc = lods[j].scale;
                  }
                }
              }
            }
          }

          if (this._mapPoint == null) {
            this._mapPoint = this.getCenter(graphic);
          }
          if (sc == 0 || this._isexpand) {
            this.map.setExtent(graphic.geometry.getExtent().expand(2)).then(
              lang.hitch(this, function() {
                this.map.centerAt(this._mapPoint).then(
                  lang.hitch(this, function() {
                    this.setContext(this._toolGra);
                  })
                );
              })
            );
          } else {
            this.map.setScale(sc).then(
              lang.hitch(this, function() {
                this.map.centerAt(this._mapPoint).then(
                  lang.hitch(this, function() {
                    this.setContext(this._toolGra);
                  })
                );
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
      var label = this._label;
      var context;
      for (var i = 0; i < this.config.tooltips.length; i++) {
        var tooltip = this.config.tooltips[i];
        if (tooltip.label === label) {
          context = tooltip.context;
          this._joinField = tooltip.joinfield;
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
      if (
        this._isClick &&
        this._joinField !== null &&
        this._joinField !== undefined
      ) {
        if (graphic.attributes[this._joinField] == null) {
          return;
        }
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
      var text = "";
      try {
        text = string.substitute(context, contextObj);
      } catch (e) {
        text = context.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g, "");
      }

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
      var scolor = new Color([0, 255, 255]);
      if (this._selectcolor === null || this._selectcolor === undefined) {
      } else if (this._selectcolor == "red") {
        scolor = new Color([255, 0, 0]);
      } else {
        scolor = new Color(this._selectcolor);
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
            scolor,
            5
          );
        } else {
          selectionSymbol = new SimpleFillSymbol(
            SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH, scolor, 3),
            new Color([0, 0, 0, 0])
          );
        }
        var layer = this._hightlightLayer;

        if (this._timeOut) {
          layer.clear();
          this._clearTimeout(1);
        }

        if (this._timeOut2) {
          //this.clear();
          this._clearTimeout(2);
        }
        var hlGra = new Graphic(graphic.geometry, selectionSymbol);
        this._hightlightLayer.add(hlGra);
        var node = hlGra.getNode();
        node.setAttribute("data-highlight", "highlight");

        this._timeOut = setTimeout(function() {
          layer.remove(hlGra);
        }, 4000);
        this._timeOut2 = setTimeout(
          lang.hitch(this, function() {
            this.clear();
          }),
          10000
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
      for (var i = 0; i < this._tooltipNodes.length; i++) {
        var node = this._tooltipNodes[i].node;
        if (node) {
          domUtils.hide(node);
        }
      }
    },
    show: function() {
      this._show();
    },
    _show: function() {
      for (var i = 0; i < this._tooltipNodes.length; i++) {
        var node = this._tooltipNodes[i].node;
        if (node) {
          domUtils.show(node);
        }
      }
    },
    getScreentPoint: function(mapPoint) {
      var screenPoint;
      if (mapPoint) {
        //this._mapPoint=webMercatorUtils.geographicToWebMercator(this._mapPoint);
        screenPoint = this.map.toScreen(mapPoint);
      }
      return screenPoint;
    },
    drawText: function() {
      var ss = this.map.root; //this._layer.container;//dom.byId(this._gl.id);
      ss.appendChild(this._node);

      var xy = this.getScreentPoint(this._mapPoint);

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
      for (var i = 0; i < this._tooltipNodes.length; i++) {
        var node = this._tooltipNodes[i].node;
        var point = this._tooltipNodes[i].mapPoint;
        var offsetx = this._tooltipNodes[i].offsetX;
        var offsety = this._tooltipNodes[i].offsetY;
        if (node) {
          var dx = e.delta.x;
          var dy = e.delta.y;
          var dd = this.getScreentPoint(point);
          domStyle.set(node, {
            left: dd.x + dx + offsetx + "px",
            top: dd.y + dy + offsety + "px"
          });
        }
      }
    },
    zoomchangeText: function(e) {
      for (var i = 0; i < this._tooltipNodes.length; i++) {
        var node = this._tooltipNodes[i].node;
        var point = this._tooltipNodes[i].mapPoint;
        var offsetx = this._tooltipNodes[i].offsetX;
        var offsety = this._tooltipNodes[i].offsetY;
        if (node) {
          var dx = e.anchor.x;
          var dy = e.anchor.y;
          var dd = this.getScreentPoint(point);
          domStyle.set(node, {
            left: dd.x + offsetx + "px",
            top: dd.y + offsety + "px"
          });
        }
      }
    },
    clear: function() {
      $(".MapText").remove();
      for (var i = 0; i < this._tooltipNodes.length; i++) {
        var node = this._tooltipNodes[i].node;
        domConstruct.destroy(node);
      }
      this._node = null;
      this._tooltipNodes = [];
    },
    getScales: function(id, scales) {
      var scale = 0;
      if (scales) {
        for (var i = 0; i < scales.length; i++) {
          var item = scales[i];
          if (item.layerid === id) {
            scale = item.scale;
            break;
          }
        }
      } else {
        scale = 0;
      }
      return scale;
    },
    _clearTimeout: function(a) {
      console.log("clearTimeout");
      if (a == 1) {
        clearTimeout(this._timeOut);
        this._timeOut = null;
      } else if (a == 2) {
        clearTimeout(this._timeOut2);
        this._timeOut2 = null;
      }
    },
    startup: function() {},

    _onTopicHandler_showToolTip: function(param) {
      var graphic = param.graphic;
      var geometry = param.geometry;
      var context = param.context;
      var label = param.label;
      var tipClass = param.tipClass || "TextDiv";

      this._place = "top";
      if (graphic) {
        this._mapPoint = this.getCenter(graphic);
      }
      if (geometry) {
        this._mapPoint = new Point([geometry.x, geometry.y]);
      }
      this._offset = param.offset || 30;
      //this._first = true;
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
      var contextObj = {};
      if (graphic) {
        for (var field in graphic.attributes) {
          contextObj[field] =
            graphic.attributes[field] == null ? "" : graphic.attributes[field];
        }
      }
      var text = context;
      try {
        text = string.substitute(context, contextObj);
      } catch (e) {
        text = context.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g, "");
      }

      var divClass = this._place == "top" ? "TextTriTop" : "TextTriRight";
      if (text.toString().indexOf("div") > -1) {
        this._node = domConstruct.toDom(text);
      } else {
        text = text.replace(/\n/g, "<br/>");
        this._node = domConstruct.toDom(
          "<div class='MapText " +
            tipClass +
            "'><span>" +
            text +
            "</span><div class='" +
            divClass +
            "'></div></div>"
        );
      }
      this.init();
    },
    _onTopicHandler_clearToolTip: function() {
      this.clear();
    }
  });
});
