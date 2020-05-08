<<<<<<< HEAD
define(["dojo/_base/declare", "dojo/_base/lang", "dojo/topic", "jimu/BaseWidget", "esri/graphic", "esri/layers/GraphicsLayer", "esri/geometry/jsonUtils", "esri/geometry/Point", "esri/symbols/PictureMarkerSymbol", "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleFillSymbol", "esri/geometry/geometryEngine", "esri/geometry/webMercatorUtils", "esri/toolbars/draw"], function (declare, lang, topic, BaseWidget, Graphic, GraphicsLayer, geometryJsonUtils, Point, PictureMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, geometryEngine, webMercatorUtils, Draw) {
=======
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
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
  return declare([BaseWidget], {
    _graphicsLayer: null,

    _fbdDatas: null,

    _pointSymbol: null,
    _polylineSymbol: null,
    _polygonSymbol: null,
    _changedOverlay: [],

<<<<<<< HEAD
    _drawToolbar: null,
    _searchParamerters: null,

    postCreate: function postCreate() {
=======
    postCreate: function() {
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
      this.inherited(arguments);

      this._graphicsLayer = new GraphicsLayer();
      this.map.addLayer(this._graphicsLayer);

      this._fbdDatas = new Map();

<<<<<<< HEAD
      this._drawToolbar = new Draw(this.map);
      this._drawToolbar.on("draw-end", lang.hitch(this, this.onDrawToolbar_drawEnd));

=======
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
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

<<<<<<< HEAD
      topic.subscribe("mixinSearch", lang.hitch(this, this.onTopicHandler_mixinSearch));

      topic.subscribe("clearMixinSearch", lang.hitch(this, this.onTopicHandler_clearMixinSearch));
    },

    onDrawToolbar_drawEnd: function onDrawToolbar_drawEnd(event) {
      this._drawToolbar.deactivate();
      var symbol = void 0;
      switch (event.geometry.type) {
        case "point":
        case "multipoint":
          symbol = this._pointSymbol;
          break;
        case "polyline":
          symbol = this._polylineSymbol;
          break;
        case "polygon":
          symbol = this._polygonSymbol;
          break;
      }
      var graphic = new Graphic(event.geometry, symbol);
      this._graphicsLayer.add(graphic);

      var geometry = this.map.spatialReference.isWebMercator() ? webMercatorUtils.webMercatorToGeographic(event.geometry) : event.geometry;
      this._searchParamerters.params.geometry = geometry.toJson();
      this._doSearch(this._searchParamerters);
    },

    onTopicHandler_mixinSearch: function onTopicHandler_mixinSearch(parameter) {
      this._clearSearch();

      this._searchParamerters = parameter;
      if (parameter.params.drawType) {
        this._drawToolbar.activate(Draw[parameter.params.drawType.toUpperCase().replace(/ /g, "_")]);
      } else if (parameter.params.geometry) {
        this._doSearch(parameter);
      }
    },

    _doSearch: function _doSearch(parameter) {
      var params = parameter.params,
          callback = parameter.callback;
      var geometry = params.geometry,
          radius = params.radius,
          showGeometry = params.showGeometry,
          showBuffer = params.showBuffer,
          showResult = params.showResult,
          contents = params.contents;

      var searchGeometry = geometryJsonUtils.fromJson(geometry);
=======
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
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
      if (showGeometry) {
        this._showGeometry(searchGeometry);
      }
      //处理缓冲
<<<<<<< HEAD
      var bufferGeometry = void 0;
      if (radius > 0) {
        bufferGeometry = this._bufferGeometry(searchGeometry, radius);
        if (showBuffer && bufferGeometry) {
=======
      let bufferGeometry;
      if (radius > 0) {
        bufferGeometry = this._bufferGeometry(searchGeometry, radius);
        if (showBuffer) {
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
          this._showGeometry(bufferGeometry);
        }
      }

<<<<<<< HEAD
      var searchResults = [];
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = contents[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var searchContent = _step.value;
          var types = searchContent.types,
              searchClass = searchContent.class;

          switch (searchClass) {
            case "poi":
              if (searchGeometry.type === "point" && radius > 0) {
                var poiResult = this._poiSearch({
                  x: searchGeometry.x,
                  y: searchGeometry.y,
                  radius: radius,
                  types: types,
                  showResult: showResult
                });
                searchResults.push(poiResult);
              }
              break;

            case "overlay":
              var overlayResults = this._overlaySearch({
                geometry: bufferGeometry || searchGeometry,
                types: types,
                showResult: showResult
              });
              overlayResults.searchGeometry = searchGeometry;
              searchResults.push(overlayResults);
              break;

            case "fbd":
              var fbdResults = this._fbdSearch({
                x: searchGeometry.x,
                y: searchGeometry.y,
                geometry: bufferGeometry || searchGeometry,
                types: types
              });
              searchResults.push(fbdResults);
              break;
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
=======
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
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
        }
      }

      if (typeof callback === "function") {
        callback(searchResults);
      }
    },

<<<<<<< HEAD
    _overlaySearch: function _overlaySearch(overlayParam) {
=======
    _overlaySearch: function(overlayParam) {
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
      if (!this._overlayGraphics) {
        return {
          class: "overlay",
          result: []
        };
      }
<<<<<<< HEAD
      var containerGeometry = overlayParam.geometry,
          types = overlayParam.types,
          showResult = overlayParam.showResult;

      var searchType = types ? types.split(",") : [];
      var searchGraphics = this._overlayGraphics.filter(function (graphic) {
=======
      const { geometry: containerGeometry, types, showResult } = overlayParam;
      const searchType = types ? types.split(",") : [];
      const searchGraphics = this._overlayGraphics.filter(graphic => {
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
        //没传type属性，就搜索所有可见图层
        if (searchType.length === 0) {
          return graphic.visible;
        } else {
          return searchType.indexOf(graphic.type) >= 0;
        }
      });
<<<<<<< HEAD
      var overlayResult = [];
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = searchGraphics[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var graphic = _step2.value;

          var insideGeometry = this.map.spatialReference.isWebMercator() ? webMercatorUtils.webMercatorToGeographic(graphic.geometry) : graphic.geometry;

          var contained = geometryEngine.contains(containerGeometry, insideGeometry);
          if (contained) {
            if (showResult && !graphic.visible) {
              graphic.visible = true;
              graphic.draw();
              this._changedOverlay.push(graphic);
            }
            overlayResult.push({
              id: graphic.id,
              type: graphic.type,
              fields: graphic.attributes,
              location: insideGeometry
            });
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

=======
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
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
      return {
        class: "overlay",
        result: overlayResult
      };
    },

<<<<<<< HEAD
    _fbdSearch: function _fbdSearch(fbdParams) {
      var x = fbdParams.x,
          y = fbdParams.y,
          containerGeometry = fbdParams.geometry,
          types = fbdParams.types;

      var centerPoint = !isNaN(x) && !isNaN(y) ? new Point(x, y) : containerGeometry.getCentroid();
      var graphics = [];
      var fbdResults = [];

      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = this._fbdDatas.keys()[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var type = _step3.value;

          if (!types || types.length === 0 || types.indexOf(type) >= 0) {
            var fbdData = this._fbdDatas.get(type);
            var filtered = fbdData.filter(function (graphic) {
              var polygon = graphic.geometry;
              if (geometryEngine.intersects(containerGeometry, polygon)) {
                graphic.distanceToPoint = geometryEngine.nearestCoordinate(polygon, centerPoint).distance;
                return true;
              }
            });
            graphics = graphics.concat(filtered);
          }
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }

      if (graphics.length >= 0) {
        var sorted = graphics.sort(function (obj1, obj2) {
          return obj1.distanceToPoint - obj2.distanceToPoint;
        });
        fbdResults = sorted.map(function (graphic) {
          return {
            id: graphic.id,
            type: graphic.type,
            name: graphic.name
          };
        });
=======
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
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
      }
      return {
        class: "fbd",
        result: fbdResults
      };
    },

<<<<<<< HEAD
    _poiSearch: function _poiSearch(poiParam) {
      var _this = this;

      var x = poiParam.x,
          y = poiParam.y,
          radius = poiParam.radius,
          types = poiParam.types,
          showResult = poiParam.showResult;

      var poiResult = [];
      $.get(this.config.poi.url, {
        ak: this.config.poi.ak,
        location: x + "," + y,
        radius: radius,
        type: types.replace(",", "|"),
        page_size: 100
      }, null, "jsonp").then(function (response) {
        if (response.message === "ok") {
          response.results.forEach(function (result) {
=======
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
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
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
<<<<<<< HEAD
              var graphic = new Graphic({
=======
              const graphic = new Graphic({
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
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
<<<<<<< HEAD
              _this._graphicsLayer.add(graphic);
=======
              this._graphicsLayer.add(graphic);
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
            }
          });
        }
      });

      return {
        class: "poi",
        result: poiResult
      };
    },

<<<<<<< HEAD
    _showGeometry: function _showGeometry(geometry) {
      var graphic = new Graphic(geometry);
=======
    _showGeometry: function(geometry) {
      const graphic = new Graphic(geometry);
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
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

<<<<<<< HEAD
    _bufferGeometry: function _bufferGeometry(geometry, radius) {
      if (this.map.spatialReference.wkid === "4326" || this.map.spatialReference.isWebMercator()) {
=======
    _bufferGeometry: function(geometry, radius) {
      if (
        this.map.spatialReference.wkid === "4326" ||
        this.map.spatialReference.isWebMercator()
      ) {
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
        return geometryEngine.geodesicBuffer(geometry, radius, "meters");
      } else {
        return geometryEngine.buffer(geometry, radius, "meters");
      }
    },

<<<<<<< HEAD
    onTopicHandler_clearMixinSearch: function onTopicHandler_clearMixinSearch() {
      this._clearSearch();
    },

    _clearSearch: function _clearSearch() {
      this._graphicsLayer.clear();
      this._changedOverlay.forEach(function (graphic) {
=======
    onTopicHandler_clearMixinSearch: function() {
      this._clearSearch();
    },

    _clearSearch: function() {
      this._graphicsLayer.clear();
      this._changedOverlay.forEach(graphic => {
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
        graphic.visible = false;
        graphic.draw();
      });
      this._changedOverlay = [];
    },

<<<<<<< HEAD
    onReceiveData: function onReceiveData(name, widgetId, data, historyData) {
=======
    onReceiveData: function(name, widgetId, data, historyData) {
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
      if (widgetId === "OverlayWidget") {
        this._overlayGraphics = data;
      }
    },

<<<<<<< HEAD
    _getFBD: function _getFBD() {
      var _this2 = this;

      var fbdConfigs = this.config.fbd;

      fbdConfigs.forEach(function (fbdConfig) {
        var type = fbdConfig.type,
            source = fbdConfig.source,
            idField = fbdConfig.idField,
            name = fbdConfig.name;

        if (!_this2._fbdDatas.has(type)) {
          _this2._fbdDatas.set(type, []);
        }

        fetch(window.path + source).then(function (fetchResponse) {
          fetchResponse.json().then(function (layerData) {
            var features = layerData.features;

            var graphics = features.map(function (feature) {
              var graphic = new Graphic(feature);
=======
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
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
              graphic.id = graphic.attributes[idField];
              graphic.type = type;
              graphic.name = name.format(graphic.attributes);
              return graphic;
            });
<<<<<<< HEAD
            var allData = _this2._fbdDatas.get(type).concat(graphics);
            _this2._fbdDatas.set(type, allData);
=======
            const allData = this._fbdDatas.get(type).concat(graphics);
            this._fbdDatas.set(type, allData);
>>>>>>> 1e93de92ca458248b8448852db9063820b708052
          });
        });
      });
    }
  });
});
