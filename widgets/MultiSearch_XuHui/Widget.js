define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "jimu/BaseWidget",
  "esri/graphic",
  "esri/layers/GraphicsLayer",
  "esri/geometry/jsonUtils",
  "esri/geometry/Point",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/geometry/geometryEngine",
  "esri/geometry/webMercatorUtils"
], function(
  declare,
  lang,
  topic,
  BaseWidget,
  Graphic,
  GraphicsLayer,
  geometryJsonUtils,
  Point,
  PictureMarkerSymbol,
  SimpleLineSymbol,
  SimpleFillSymbol,
  geometryEngine,
  webMercatorUtils
) {
  return declare([BaseWidget], {
    _graphicsLayer: null,

    _fbdDatas: null,

    _pointSymbol: null,
    _polylineSymbol: null,
    _polygonSymbol: null,
    _changedOverlay: [],

    postCreate: function() {
      this.inherited(arguments);

      this._graphicsLayer = new GraphicsLayer();
      this.map.addLayer(this._graphicsLayer);

      this._fbdDatas = new Map();

      this._pointSymbol = new PictureMarkerSymbol({
        url: window.path + "images/mapIcons/m0.png",
        width: 16,
        height: 16
      });

      this._polylineSymbol = new SimpleLineSymbol({
        type: "esriSLS",
        style: "esriSLSSolid",
        color: [63, 81, 181, 255],
        width: 1
      });

      this._polygonSymbol = new SimpleFillSymbol({
        type: "esriSFS",
        style: "esriSFSSolid",
        color: [33, 150, 243, 100],
        outline: {
          type: "esriSLS",
          style: "esriSLSDash",
          color: [63, 81, 181, 255],
          width: 1
        }
      });

      this._getFBD();

      topic.subscribe(
        "mixinSearch",
        lang.hitch(this, this.onTopicHandler_mixinSearch)
      );

      topic.subscribe(
        "clearMixinSearch",
        lang.hitch(this, this.onTopicHandler_clearMixinSearch)
      );
    },

    onTopicHandler_mixinSearch: function(parameter) {
      this._clearSearch();

      const { params, callback } = parameter;
      const {
        geometry,
        radius,
        showGeometry,
        showBuffer,
        showResult,
        contents
      } = params;
      const searchGeometry = geometryJsonUtils.fromJson(geometry);
      if (showGeometry) {
        this._showGeometry(searchGeometry);
      }
      //处理缓冲
      let bufferGeometry;
      if (radius > 0) {
        bufferGeometry = this._bufferGeometry(searchGeometry, radius);
        if (showBuffer) {
          this._showGeometry(bufferGeometry);
        }
      }

      const searchResults = [];
      for (const searchContent of contents) {
        const { types, class: searchClass } = searchContent;
        switch (searchClass) {
          case "poi":
            if (searchGeometry.type === "point" && radius > 0) {
              const poiResult = this._poiSearch({
                x: searchGeometry.x,
                y: searchGeometry.y,
                radius,
                types,
                showResult
              });
              searchResults.push(poiResult);
            }
            break;

          case "overlay":
            const overlayResults = this._overlaySearch({
              geometry: bufferGeometry || searchGeometry,
              types,
              showResult
            });
            searchResults.push(overlayResults);
            break;

          case "fbd":
            const fbdResults = this._fbdSearch({
              x: searchGeometry.x,
              y: searchGeometry.y,
              geometry: bufferGeometry || searchGeometry,
              types
            });
            searchResults.push(fbdResults);
            break;
        }
      }

      if (typeof callback === "function") {
        callback(searchResults);
      }
    },

    _overlaySearch: function(overlayParam) {
      if (!this._overlayGraphics) {
        return {
          class: "overlay",
          result: []
        };
      }
      const { geometry: containerGeometry, types, showResult } = overlayParam;
      const searchType = types ? types.split(",") : [];
      const searchGraphics = this._overlayGraphics.filter(graphic => {
        //没传type属性，就搜索所有可见图层
        if (searchType.length === 0) {
          return graphic.visible;
        } else {
          return searchType.indexOf(graphic.type) >= 0;
        }
      });
      const overlayResult = [];
      for (const graphic of searchGraphics) {
        const insideGeometry = this.map.spatialReference.isWebMercator()
          ? webMercatorUtils.webMercatorToGeographic(graphic.geometry)
          : graphic.geometry;

        const contained = geometryEngine.contains(
          containerGeometry,
          insideGeometry
        );
        if (contained) {
          if (showResult && !graphic.visible) {
            graphic.visible = true;
            graphic.draw();
            this._changedOverlay.push(graphic);
          }
          overlayResult.push({
            id: graphic.id,
            type: graphic.type,
            location: insideGeometry
          });
        }
      }
      return {
        class: "overlay",
        result: overlayResult
      };
    },

    _fbdSearch: function(fbdParams) {
      const { x, y, geometry: containerGeometry, types } = fbdParams;
      const centerPoint = new Point(x, y);
      let graphics = [];
      let fbdResults = [];

      for (let type of this._fbdDatas.keys()) {
        if (!types || types.length === 0 || types.indexOf(type) >= 0) {
          const fbdData = this._fbdDatas.get(type);
          const filtered = fbdData.filter(graphic => {
            const polygon = graphic.geometry;
            if (geometryEngine.intersects(containerGeometry, polygon)) {
              graphic.distanceToPoint = geometryEngine.nearestCoordinate(
                polygon,
                centerPoint
              ).distance;
              return true;
            }
          });
          graphics = graphics.concat(filtered);
        }
      }
      if (graphics.length >= 0) {
        const sorted = graphics.sort(function(obj1, obj2) {
          return obj1.distanceToPoint - obj2.distanceToPoint;
        });
        fbdResults = sorted.map(graphic => ({
          id: graphic.id,
          type: graphic.type,
          name: graphic.name
        }));
      }
      return {
        class: "fbd",
        result: fbdResults
      };
    },

    _poiSearch: function(poiParam) {
      const { x, y, radius, types, showResult } = poiParam;
      const poiResult = [];
      $.get(
        this.config.poi.url,
        {
          ak: this.config.poi.ak,
          location: `${x},${y}`,
          radius,
          type: types.replace(",", "|"),
          page_size: 100
        },
        null,
        "jsonp"
      ).then(response => {
        if (response.message === "ok") {
          response.results.forEach(result => {
            poiResult.push({
              id: result.uid,
              name: result.name,
              location: [result.location.lng, result.location.lat],
              type: location.type,
              attributes: {
                address: result.address,
                telephone: result.telephone
              }
            });
            //在地图上显示poi点
            if (showResult) {
              const graphic = new Graphic({
                geometry: {
                  x: result.location.lng,
                  y: result.location.lat
                },
                symbol: {
                  type: "esriSMS",
                  style: "esriSMSCircle",
                  color: [255, 0, 0, 128],
                  size: 8,
                  outline: {
                    type: "esriSLS",
                    style: "esriSLSSolid",
                    color: "white",
                    width: 1
                  }
                },
                attributes: {
                  name: result.name,
                  address: result.address,
                  telephone: result.telephone
                },
                infoTemplate: {
                  title: "${name}",
                  content: "地址: ${address}<br/>电话: ${telephone}"
                }
              });
              this._graphicsLayer.add(graphic);
            }
          });
        }
      });

      return {
        class: "poi",
        result: poiResult
      };
    },

    _showGeometry: function(geometry) {
      const graphic = new Graphic(geometry);
      switch (geometry.type) {
        case "point":
          graphic.symbol = this._pointSymbol;
          break;

        case "polyline":
          graphic.symbol = this._polylineSymbol;
          break;

        case "polygon":
          graphic.symbol = this._polygonSymbol;
          break;
      }
      this._graphicsLayer.add(graphic);
    },

    _bufferGeometry: function(geometry, radius) {
      if (
        this.map.spatialReference.wkid === "4326" ||
        this.map.spatialReference.isWebMercator()
      ) {
        return geometryEngine.geodesicBuffer(geometry, radius, "meters");
      } else {
        return geometryEngine.buffer(geometry, radius, "meters");
      }
    },

    onTopicHandler_clearMixinSearch: function() {
      this._clearSearch();
    },

    _clearSearch: function() {
      this._graphicsLayer.clear();
      this._changedOverlay.forEach(graphic => {
        graphic.visible = false;
        graphic.draw();
      });
      this._changedOverlay = [];
    },

    onReceiveData: function(name, widgetId, data, historyData) {
      if (widgetId === "OverlayWidget") {
        this._overlayGraphics = data;
      }
    },

    _getFBD: function() {
      const { fbd: fbdConfigs } = this.config;
      fbdConfigs.forEach(fbdConfig => {
        const { type, source, idField, name } = fbdConfig;
        if (!this._fbdDatas.has(type)) {
          this._fbdDatas.set(type, []);
        }

        fetch(window.path + source).then(fetchResponse => {
          fetchResponse.json().then(layerData => {
            const { features } = layerData;
            const graphics = features.map(feature => {
              const graphic = new Graphic(feature);
              graphic.id = graphic.attributes[idField];
              graphic.type = type;
              graphic.name = name.format(graphic.attributes);
              return graphic;
            });
            const allData = this._fbdDatas.get(type).concat(graphics);
            this._fbdDatas.set(type, allData);
          });
        });
      });
    }
  });
});
