/**
 * 将坐标点定位到发布段上
 * */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "jimu/BaseWidget",
  "esri/graphic",
  "esri/geometry/Point",
  "esri/geometry/Polygon",
  "esri/geometry/geometryEngine",
  "esri/geometry/webMercatorUtils",
  "esri/layers/GraphicsLayer"
], function(
  declare,
  lang,
  topic,
  BaseWidget,
  Graphic,
  Point,
  Polygon,
  geometryEngine,
  webMercatorUtils,
  GraphicsLayer
) {
  return declare([BaseWidget], {
    _graphics: [],
    _resultLayer: null,

    postCreate: function() {
      this.inherited(arguments);
      this._getAllGraphics();

      this._resultLayer = new GraphicsLayer();
      this.map.addLayer(this._resultLayer);

      topic.subscribe(
        "locateInGeometry",
        lang.hitch(this, this.onTopicHandler_locateInGeometry)
      );
    },

    /**获取所有发布段的graphic*/
    _getAllGraphics: function() {
      this.config.layers.forEach(layerConfig =>  {
        fetch(window.path + layerConfig.source).then(response => {
          response.json().then(json => {
            this._getGraphic(json.features, layerConfig);
          })
        });
      });
    },

    _getGraphic: function(features, layerConfig) {
      const label = layerConfig.label;
      const idField = layerConfig.idField;
      const roadNameField = layerConfig.roadNameField;
      const graphics = features.map(function(feature) {
        const graphic = new Graphic(feature);
        graphic.id = graphic.attributes[idField];
        graphic.layerName = label;
        graphic.roadName = graphic.attributes[roadNameField];
        return graphic;
      });
      this._graphics = this._graphics.concat(graphics);
    },

    onTopicHandler_locateInGeometry: function(callParam) {
      const params = callParam.params;
      const callback = callParam.callback;
      const resolve = callParam.resolve;

      const nearestGraphic = this._locatePointInGeometry(params);
      let result;
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

    _locatePointInGeometry: function(params) {
      const x = params.x;
      const y = params.y;

      const point = new Point(x, y);
      //生成100米的缓冲区
      const pointBuffer = geometryEngine.geodesicBuffer(point, 100, "meters");

      //获取和缓冲区相交的发布段
      const filtered = this._graphics.filter(function(graphic) {
        const polygon = graphic.geometry;
        if (geometryEngine.intersects(polygon, pointBuffer)) {
          //如果相交，计算发布段和中心点的距离
          graphic.distanceToPoint = geometryEngine.nearestCoordinate(
            polygon,
            point
          ).distance;
          return true;
        }
      });

      //按距离排序
      if (filtered.length >= 0) {
        const sorted = filtered.sort(function(obj1, obj2) {
          return obj1.distanceToPoint - obj2.distanceToPoint;
        });
        //返回距离最近的发布段
        return sorted[0];
      } else {
        return null;
      }
    },

    onTopicHandler_searchIssuesect: function(params) {}
  });
});
