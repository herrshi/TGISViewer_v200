/**
 * Created by lvliang on 2019/4/18.
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/query",
  "dojo/dom-construct",
  "jimu/BaseWidget",
  "jimu/utils",
  "esri/graphic",
  "esri/layers/GraphicsLayer",
  "esri/geometry/jsonUtils",
  "esri/geometry/webMercatorUtils",
  "esri/symbols/jsonUtils",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/PictureMarkerSymbol",
  "esri/renderers/SimpleRenderer",
  "esri/renderers/UniqueValueRenderer",
  "esri/Color",
  "esri/InfoTemplate",
  "esri/renderers/ClassBreaksRenderer",
  "jimu/CustomLayers/ClusterLayer",
  "dojo/domReady!"
], function(
  declare,
  lang,
  array,
  topic,
  query,
  domConstruct,
  BaseWidget,
  jimuUtils,
  Graphic,
  GraphicsLayer,
  geometryJsonUtils,
  WebMercatorUtils,
  symbolJsonUtils,
  SimpleLineSymbol,
  SimpleFillSymbol,
  SimpleMarkerSymbol,
  PictureMarkerSymbol,
  SimpleRenderer,
  UniqueValueRenderer,
  Color,
  InfoTemplate,
  ClassBreaksRenderer,
  ClusterLayer
) {
  return declare([BaseWidget], {
    name: "cluster",
    clusterLayers: [],
    clickclusterLayer: null,
    postCreate: function() {
      this.inherited(arguments);

      topic.subscribe(
        "addOverlaysCluster",
        lang.hitch(this, this.onTopicHandler_addOverlaysCluster)
      );
      topic.subscribe(
        "showOverlaysCluster",
        lang.hitch(this, this.onTopicHandler_showOverlays)
      );
      topic.subscribe(
        "hideOverlaysCluster",
        lang.hitch(this, this.onTopicHandler_hideOverlays)
      );
      topic.subscribe(
        "addClusters",
        lang.hitch(this, this.onTopicHandler_addCluster)
      );
    },
    onTopicHandler_addOverlaysCluster: function(params, resolve, reject) {
      var overlayParams = JSON.parse(params);
      var overlays = overlayParams.overlays;
      var distance = overlayParams.distance || 100;
      var showInfoTemplate = overlayParams.showInfoTemplate === true;
      var clusterDatas = [];
      var symbolObj;
      var type;
      var infoTemplate;
      if (overlayParams.defaultInfoTemplate !== undefined) {
        infoTemplate = new InfoTemplate();
        infoTemplate.setTitle(
          overlayParams.defaultInfoTemplate.title === ""
            ? null
            : overlayParams.defaultInfoTemplate.title
        );
        infoTemplate.setContent(overlayParams.defaultInfoTemplate.content);
      }

      array.forEach(
        overlays,
        function(overlayObj) {
          var id = overlayObj.id;
          symbolObj = overlayObj.symbol || overlayParams.defaultSymbol;
          type = overlayObj.type || overlayParams.defaultType;
          var fields = overlayObj.fields || {};
          var geometryObj = overlayObj.geometry;
          var geometry = geometryJsonUtils.fromJson(geometryObj);
          if (this.map.spatialReference.isWebMercator()) {
            geometry = WebMercatorUtils.geographicToWebMercator(geometry);
          }
          if (!fields.hasOwnProperty("id")) {
            fields.id = id;
          }
          if (!fields.hasOwnProperty("type")) {
            fields.type = type;
          }
          clusterDatas.push({
            id: id,
            type: type,
            x: geometry.x,
            y: geometry.y,
            attributes: fields
          });
        },
        this
      );
      var symbol = this._getEsriPointSymbol(symbolObj);
      this.addClusters(
        clusterDatas,
        type,
        symbol,
        infoTemplate,
        distance,
        showInfoTemplate
      );
      if (resolve) {
        resolve();
      }
    },
    _getEsriPointSymbol: function(symbolObj) {
      var symbol;
      if (symbolObj) {
        switch (symbolObj.type.toLowerCase()) {
          //picture marker Symbol
          case "picture":
          case "esriPMS".toLowerCase():
            symbol = new PictureMarkerSymbol();
            symbol.url = symbolObj.url;
            if (!isNaN(symbolObj.width)) {
              symbol.width = symbolObj.width;
            }
            if (!isNaN(symbolObj.height)) {
              symbol.height = symbolObj.height;
            }
            symbol.angle = !isNaN(symbolObj.angle) ? symbolObj.angle : 0;
            symbol.xoffset = !isNaN(symbolObj.xoffset) ? symbolObj.xoffset : 0;
            symbol.yoffset = !isNaN(symbolObj.yoffset) ? symbolObj.yoffset : 0;
            break;

          //simple marker symbol
          case "marker":
          case "esriSMS".toLowerCase():
            symbol = new SimpleMarkerSymbol();
            symbol.style = symbolObj.style
              ? _jimuMarkerStyleToEsriStyle[symbolObj.style.toLowerCase()] ||
                SimpleMarkerSymbol.STYLE_CIRCLE
              : SimpleMarkerSymbol.STYLE_CIRCLE;
            symbol.color = this._getESRIColor(
              symbolObj.color,
              symbolObj.alpha,
              [0, 0, 0, 1]
            );
            symbol.size = !isNaN(symbolObj.size) ? symbolObj.size : 8;
            symbol.angle = !isNaN(symbolObj.angle) ? symbolObj.angle : 0;
            symbol.xoffset = !isNaN(symbolObj.xoffset) ? symbolObj.xoffset : 0;
            symbol.yoffset = !isNaN(symbolObj.yoffset) ? symbolObj.yoffset : 0;
            symbol.outline = this._getESRILineSymbol(symbolObj.outline);
            break;
        }
      } else {
        //默认为黑色圆点
        symbol = new SimpleMarkerSymbol(
          SimpleMarkerSymbol.STYLE_CIRCLE,
          8,
          new SimpleLineSymbol(new Color([255, 255, 255, 1]), 1),
          new Color([0, 0, 0, 1])
        );
      }

      return symbol;
    },
    addClusters: function(
      data,
      type,
      symbol,
      infoTemplate,
      distance,
      showInfo
    ) {
      // cluster layer that uses OpenLayers style clustering
      var clusterLayer = new ClusterLayer({
        data: data,
        distance: distance,
        type: type,
        labelColor: "#fff",
        labelOffset: 10,
        resolution: this.map.extent.getWidth() / this.map.width,
        singleColor: "#888",
        singleSymbol: symbol,
        singleTemplate: infoTemplate,
        showInfo: showInfo
      });

      var renderer = new ClassBreaksRenderer(symbol, "clusterCount");

      var picBaseUrl = window.path + "images/";
      var blue = new PictureMarkerSymbol(
        picBaseUrl + "BluePin1LargeB.png",
        72,
        72
      ).setOffset(0, 15);
      var green = new PictureMarkerSymbol(
        picBaseUrl + "GreenPin1LargeB.png",
        72,
        72
      ).setOffset(0, 15);
      var red = new PictureMarkerSymbol(
        picBaseUrl + "RedPin1LargeB.png",
        72,
        72
      ).setOffset(0, 15);
      renderer.addBreak(0, 1, symbol);
      renderer.addBreak(2, 200, green);
      renderer.addBreak(200, 1001, red);

      clusterLayer.setRenderer(renderer);
      this.map.addLayer(clusterLayer);
      this.clusterLayers.push(clusterLayer);
      // close the info window when the map is clicked
      this.map.on("click", lang.hitch(this, this.cleanUp));
      clusterLayer.on(
        "click",
        lang.hitch(this, function(evt) {
          if (evt.graphic) {
            var graphic = evt.graphic;
            var id = graphic.id;
            var type = graphic.type;
            if (type !== undefined && id !== undefined) {
              if (
                typeof showGisDeviceInfo !== "undefined" &&
                showGisDeviceInfo instanceof Function
              ) {
                showGisDeviceInfo(type, id);
              }
            }
            if (!graphic.iscluster) {
              if (
                typeof showGisDeviceDetailInfo !== "undefined" &&
                showGisDeviceDetailInfo instanceof Function
              ) {
                showGisDeviceDetailInfo({
                  type: type,
                  id: id,
                  label: graphic.getLayer().label,
                  graphic: graphic.geometry.spatialReference.isWebMercator()
                    ? new Graphic(
                        WebMercatorUtils.webMercatorToGeographic(
                          graphic.geometry
                        ),
                        graphic.symbol,
                        graphic.attributes
                      )
                    : graphic
                });
              }
            }
          }
          if (
            this.clickclusterLayer &&
            this.clickclusterLayer.id != clusterLayer.id
          ) {
            this.clickclusterLayer.clearSingles();
          }
          this.clickclusterLayer = clusterLayer;
        })
      );
    },

    cleanUp: function() {
      this.map.infoWindow.hide();
      array.forEach(this.clusterLayers, function(clusterLayer) {
        clusterLayer.clearSingles();
      });
    },
    getLayerByLabel: function(label) {
      var findLayer;
      for (var i = 0; i < this.map.graphicsLayerIds.length; i++) {
        var layer = this.map.getLayer(this.map.graphicsLayerIds[i]);
        if (layer && layer.label && layer.label == label) {
          findLayer = layer;
        }
      }
      return findLayer;
    },
    onTopicHandler_addCluster: function(params) {
      var labels = params.labels;
      var distance = params.distance || 100;
      if (labels && labels.length > 0) {
        for (var i = 0; i < labels.length; i++) {
          var layer = this.getLayerByLabel(labels[i]);
          layer.hide();
          var graphics = layer.graphics;
          var clusterDatas = [];
          var symbol;
          array.forEach(
            graphics,
            lang.hitch(this, function(graphic) {
              var geometry = graphic.geometry;
              symbol = graphic.symbol;
              clusterDatas.push({
                x: geometry.x,
                y: geometry.y,
                attributes: graphic.attributes
              });
            })
          );
          this.addClusters(
            clusterDatas,
            layer.label,
            layer.renderer.symbol,
            layer.infoTemplate,
            distance,
            false
          );
        }
      }
    },
    onTopicHandler_showOverlays: function(params) {
      var types = params.types || [];
      var ids = params.ids || [];
      for (var i = 0; i < this.clusterLayers.length; i++) {
        var layer = this.clusterLayers[i];
        for (var j = 0; j < layer.graphics.length; j++) {
          var graphic = layer.graphics[j];
          if (
            //只判断type
            (types.length > 0 &&
              ids.length === 0 &&
              array.indexOf(types, graphic.type) >= 0) ||
            //只判断id
            (types.length === 0 &&
              ids.length > 0 &&
              array.indexOf(ids, graphic.id) >= 0) ||
            //type和id都要判断
            (types.length > 0 &&
              ids.length > 0 &&
              array.indexOf(types, graphic.type) >= 0 &&
              array.indexOf(ids, graphic.id) >= 0)
          ) {
            graphic.visible = true;
            graphic.attributes.visible = true;
          }
        }
        layer._setShowGraphic(ids, types);
        layer._refreshClusterLayer();
      }
    },

    onTopicHandler_hideOverlays: function(params) {
      var types = params.types || [];
      var ids = params.ids || [];
      for (var i = 0; i < this.clusterLayers.length; i++) {
        var layer = this.clusterLayers[i];
        for (var j = 0; j < layer.graphics.length; j++) {
          var graphic = layer.graphics[j];
          if (
            //只判断type
            (types.length > 0 &&
              ids.length === 0 &&
              array.indexOf(types, graphic.type) >= 0) ||
            //只判断id
            (types.length === 0 &&
              ids.length > 0 &&
              array.indexOf(ids, graphic.id) >= 0) ||
            //type和id都要判断
            (types.length > 0 &&
              ids.length > 0 &&
              array.indexOf(types, graphic.type) >= 0 &&
              array.indexOf(ids, graphic.id) >= 0)
          ) {
            graphic.visible = false;
            graphic.attributes.visible = false;
          }
        }
        layer._setHideGraphic(ids, types);
        layer._refreshClusterLayer();
      }
    }
  });
});
