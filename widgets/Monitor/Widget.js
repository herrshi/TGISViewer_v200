define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/_base/xhr",
  "esri/request",
  "esri/layers/GraphicsLayer",
  "esri/geometry/Point",
  "esri/geometry/geometryEngine",
  "esri/tasks/GeometryService",
  "esri/geometry/Geometry",
  "esri/geometry/Circle",
  "esri/geometry/webMercatorUtils",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/TextSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/Color",
  "esri/symbols/Font",
  "esri/symbols/SimpleFillSymbol",
  "esri/tasks/QueryTask",
  "esri/tasks/query",
  "esri/graphic",
  "jimu/BaseWidget"
], function(
  declare,
  lang,
  array,
  topic,
  xhr,
  esriRequest,
  GraphicsLayer,
  Point,
  GeometryEngine,
  GeometryService,
  Geometry,
  Circle,
  WebMercatorUtils,
  SimpleMarkerSymbol,
  PictureMarkerSymbol,
  TextSymbol,
  SimpleLineSymbol,
  Color,
  Font,
  SimpleFillSymbol,
  QueryTask,
  Query,
  Graphic,
  BaseWidget
) {
  return declare([BaseWidget], {
    bufferLayer: null,
    carLayer: null,
    _showBuffer: true,
    _monitorLayer: null,
    monitorSymbol: new PictureMarkerSymbol(
      "images/mapIcons/JiaoWeiZhiHui/icon_camere_green.png",
      24,
      33
    ).setOffset(0, 15),
    //依次按级别分为1,2,3,4级,颜色分别为绿,黄,橙色,红色
    _colors: [
      [0, 255, 0, 0.5],
      [255, 225, 0, 0.7],
      [255, 165, 0, 0.8],
      [255, 0, 0, 0.9]
    ],
    bufferUnit: GeometryService.UNIT_METER,
    postCreate: function() {
      this.inherited(arguments);
      this.bufferLayer = new GraphicsLayer();
      this.map.addLayer(this.bufferLayer);

      this._monitorLayer = new GraphicsLayer();
      this.map.addLayer(this._monitorLayer);

      this.carLayer = new GraphicsLayer();
      this.map.addLayer(this.carLayer);

      topic.subscribe(
        "MonitorControl",
        lang.hitch(this, this._onTopicHandler_MonitorControl)
      );
    },
    _onTopicHandler_MonitorControl: function(params) {
      var monitorParams = JSON.parse(params);

      var monitorPoints = monitorParams.monitorPoints;
      var buffers = monitorParams.buffers;

      var bufferGeometrys = [];
      if (monitorPoints && monitorPoints.length > 0) {
        for (var i = 0; i < monitorPoints.length; i++) {
          var monitorpoint = monitorPoints[i];
          var geometry = new Point([monitorpoint.x, monitorpoint.y]);
          this._monitorLayer.add(new Graphic(geometry, this.monitorSymbol));
          var bufferGeometry = [];
          for (var j = 0; j < buffers.length; j++) {
            var buffer = this._doBuffer(geometry, buffers[j], j);
            bufferGeometry.push(buffer);
          }
          bufferGeometrys.push(bufferGeometry);
        }
      }

      var carPoints = monitorParams.carPoints;
      if (carPoints && carPoints.length > 0) {
        for (var k = 0; k < carPoints.length; k++) {
          var carPoint = carPoints[k];
          var carGeometry = new Point([carPoint.x, carPoint.y]);
          this.doMonitorControl(carGeometry, bufferGeometrys);
        }
      }
    },
    //生成缓冲区
    _doBuffer: function(geometry, bufferDistance, level) {
      this.bufferLayer.add(new Graphic(geometry), new SimpleMarkerSymbol());
      if (bufferDistance > 0) {
        //如果是 WGS-84或Web Mercator坐标系，使用geodesicBuffer。其他坐标系使用buffer
        var bufferPolygon =
          this.map.spatialReference.isWebMercator() ||
          this.map.spatialReference.wkid === 4326
            ? GeometryEngine.geodesicBuffer(
                geometry,
                bufferDistance,
                this.bufferUnit
              )
            : GeometryEngine.buffer(geometry, bufferDistance, this.bufferUnit);

        var bufferGraphic = new Graphic(
          bufferPolygon,
          new SimpleFillSymbol(
            SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(
              SimpleLineSymbol.STYLE_SOLID,
              new Color([255, 255, 255, 0.1]),
              1
            ),
            new Color(this._colors[level])
          )
        );
        if (this._showBuffer) {
          this.bufferLayer.add(bufferGraphic);
        }
        return bufferPolygon;
      } else {
        return null;
      }
    },
    //计算geometry在bufferGeometrys的那个范围
    doMonitorControl: function(geometry, bufferGeometrys) {
      var level = 0;
      if (bufferGeometrys && bufferGeometrys.length > 0) {
        for (var i = 0; i < bufferGeometrys.length; i++) {
          var bufferGeometry = bufferGeometrys[i];
          for (var j = 0; j < bufferGeometry.length; j++) {
            if (bufferGeometry[j].contains(geometry)) {
              var temp = j + 1;
              level = temp > level ? temp : level;
            }
          }
        }
      }
      var imgUrl = "CheDao-blue.png";
      switch (level) {
        case 1:
          imgUrl = "CheDao-grey.png";
          break;
        case 2:
          imgUrl = "CheDao-yellow.png";
          break;
        case 3:
          imgUrl = "CheDao30-black.png";
          break;
        case 4:
          imgUrl = "CheDao-red.png";
          break;
      }

      var picSymbol = new PictureMarkerSymbol(
        "images/mapIcons/" + imgUrl,
        30,
        30
      ).setOffset(0, 15);

      var carGraphic = new Graphic(geometry, picSymbol);
      this.carLayer.add(carGraphic);
    }
  });
});
