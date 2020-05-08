/**
 * 将坐标点定位到发布段上
 * */
define(["dojo/_base/declare", "dojo/_base/lang", "dojo/topic", "jimu/BaseWidget", "esri/graphic", "esri/geometry/Point", "esri/geometry/Polygon", "esri/geometry/geometryEngine", "esri/geometry/webMercatorUtils", "esri/layers/GraphicsLayer"], function (declare, lang, topic, BaseWidget, Graphic, Point, Polygon, geometryEngine, webMercatorUtils, GraphicsLayer) {
  return declare([BaseWidget], {
    _graphics: [],
    _resultLayer: null,

    postCreate: function postCreate() {
      this.inherited(arguments);
      this._getAllGraphics();

      this._resultLayer = new GraphicsLayer();
      this.map.addLayer(this._resultLayer);

      topic.subscribe("locateInGeometry", lang.hitch(this, this.onTopicHandler_locateInGeometry));
    },

    /**获取所有发布段的graphic*/
    _getAllGraphics: function _getAllGraphics() {
      var _this = this;

      this.config.layers.forEach(function (layerConfig) {
        fetch(window.path + layerConfig.source).then(function (response) {
          response.json().then(function (json) {
            _this._getGraphic(json.features, layerConfig);
          });
        });
      });
    },

    _getGraphic: function _getGraphic(features, layerConfig) {
      var label = layerConfig.label;
      var idField = layerConfig.idField;
      var roadNameField = layerConfig.roadNameField;
      var graphics = features.map(function (feature) {
        var graphic = new Graphic(feature);
        graphic.id = graphic.attributes[idField];
        graphic.layerName = label;
        graphic.roadName = graphic.attributes[roadNameField];
        return graphic;
      });
      this._graphics = this._graphics.concat(graphics);
    },

    onTopicHandler_locateInGeometry: function onTopicHandler_locateInGeometry(callParam) {
      var params = callParam.params;
      var callback = callParam.callback;
      var resolve = callParam.resolve;

      var nearestGraphic = this._locatePointInGeometry(params);
      var result = void 0;
      if (nearestGraphic) {
        result = {
          id: nearestGraphic.id,
          roadName: nearestGraphic.roadName,
          layerName: nearestGraphic.layerName
        };
      }
      if (callback) {
        callback(result);
      }
      if (resolve) {
        resolve(result);
      }
    },

    _locatePointInGeometry: function _locatePointInGeometry(params) {
      var x = params.x;
      var y = params.y;

      var point = new Point(x, y);
      //生成100米的缓冲区
      var pointBuffer = geometryEngine.geodesicBuffer(point, 100, "meters");

      //获取和缓冲区相交的发布段
      var filtered = this._graphics.filter(function (graphic) {
        var polygon = graphic.geometry;
        if (geometryEngine.intersects(polygon, pointBuffer)) {
          //如果相交，计算发布段和中心点的距离
          graphic.distanceToPoint = geometryEngine.nearestCoordinate(polygon, point).distance;
          return true;
        }
      });

      //按距离排序
      if (filtered.length >= 0) {
        var sorted = filtered.sort(function (obj1, obj2) {
          return obj1.distanceToPoint - obj2.distanceToPoint;
        });
        //返回距离最近的发布段
        return sorted[0];
      } else {
        return null;
      }
    },

    onTopicHandler_searchIssuesect: function onTopicHandler_searchIssuesect(params) {}
  });
});
