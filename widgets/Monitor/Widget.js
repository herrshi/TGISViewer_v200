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
    _objectid: 1,
    _showBufferIds: [],
    _geoBuffers: [],
    _monitorLayer: null,
    monitorSymbol: new PictureMarkerSymbol(
      "images/mapIcons/JiaoWeiZhiHui/icon_camere_green.png",
      24,
      33
    ).setOffset(0, 15),
    //依次按级别分为1,2,3,4级,颜色分别为红,橙,黄,绿
    _colors: [
      [255, 0, 0, 0.6],
      [255, 165, 0, 0.5],
      [255, 225, 0, 0.4],
      [0, 255, 0, 0.3]
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
      topic.subscribe(
        "clearMonitorControl",
        lang.hitch(this, this._onTopicHandler_clearMonitorControl)
      );
    },
    _onTopicHandler_MonitorControl: function(params) {
      var monitorParams = JSON.parse(params);
      var monitorids = monitorParams.ids || [];

      this.clear();

      var monitorType = monitorParams.monitorType;
      var buffers = monitorParams.buffers || [10000];

      var moitorGraphics = this._GetMonitorGraphics(monitorType, monitorids);
      var bufferGeometrys = [];
      if (moitorGraphics && moitorGraphics.length > 0) {
        for (var i = 0; i < moitorGraphics.length; i++) {
          var moitorGraphic = moitorGraphics[i];

          var bufferGeometry = [];
          for (var j = 0; j < buffers.length; j++) {
            var buffer = this._doBuffer(moitorGraphic, buffers[j], j);
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
          //var attr = carPoint.fields || {};
          this.doMonitorControl(carGeometry, bufferGeometrys, carPoint);
        }
      }
      this.showBufferArea();
    },

    _GetMonitorGraphics: function(overlays, ids) {
      var searchLayer_array = [];
      for (var i = 0; i < this.map.graphicsLayerIds.length; i++) {
        var layerId = this.map.graphicsLayerIds[i];
        var layer = this.map.getLayer(layerId);
        if (layer.url) {
        } else {
          //graphicslayer
          if (overlays) {
            array.forEach(
              layer.graphics,
              lang.hitch(this, function(graphic) {
                if (
                  overlays &&
                  graphic.type &&
                  overlays.indexOf(graphic.type) > -1
                ) {
                  if (ids.length > 0) {
                    if (ids.indexOf(graphic.id) > -1) {
                      searchLayer_array.push(graphic);
                    }
                  } else {
                    searchLayer_array.push(graphic);
                  }
                }
              })
            );
          }
        }
      }
      return searchLayer_array;
    },
    //生成缓冲区
    _doBuffer: function(graphic, bufferDistance, level) {
      //this.bufferLayer.add(new Graphic(geometry), new SimpleMarkerSymbol());
      var geometry = graphic.geometry;
      var id = graphic.id + level;
      var monitorid = graphic.id;
      var bufferPolygon;
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
      } else {
        bufferPolygon = geometry;
      }
      bufferPolygon.OBJECTID = id;
      bufferPolygon.MID = monitorid;
      this._objectid++;

      return bufferPolygon;
    },
    //计算geometry在bufferGeometrys的那个范围
    doMonitorControl: function(geometry, bufferGeometrys, carPoint) {
      var level = 5;
      if (bufferGeometrys && bufferGeometrys.length > 0) {
        for (var i = 0; i < bufferGeometrys.length; i++) {
          var bufferGeometry = bufferGeometrys[i];
          for (var j = 0; j < bufferGeometry.length; j++) {
            if (
              carPoint.hasOwnProperty("monitorids") &&
              carPoint.monitorids.indexOf(bufferGeometry[j].MID) > -1
            ) {
              if (bufferGeometry[j].contains(geometry)) {
                level = j + 1;
                this._geoBuffers.push({
                  level: j,
                  geometry: bufferGeometry[j]
                });
                break;
              }
            }
          }
        }
      }
      var imgUrl = "car_blue.png";
      var stateHtml = "";
      switch (level) {
        case 1:
          imgUrl = "car_red.png";
          stateHtml = "<font  color='red'>红色</font>";
          break;
        case 2:
          imgUrl = "car_orange.png";
          stateHtml = "<font  color='orange'>橙色</font>";
          break;
        case 3:
          imgUrl = "car_yellow.png";
          stateHtml = "<font  color='yellow'>黄色</font>";
          break;
        case 4:
          imgUrl = "car_green.png";
          stateHtml = "<font  color='green'>绿色</font>";
          break;
      }
      var attr = carPoint.fields || {};
      var angle = attr.angle || 0;
      var picSymbol = new PictureMarkerSymbol("images/" + imgUrl, 30, 30)
        .setOffset(0, 15)
        .setAngle(angle);
      attr.state = stateHtml;
      var carGraphic = new Graphic(geometry, picSymbol, attr);
      carGraphic.id = carPoint.id;
      carGraphic.type = carPoint.type;
      this.carLayer.add(carGraphic);

      if (level < 5) {
        topic.publish("showToolTip", {
          graphic: carGraphic,
          label: "车辆",
          offset: 40
        });
      }
    },
    showBufferArea: function() {
      this._geoBuffers.sort(function(a, b) {
        return a.level - b.level;
      });
      for (var i = this._geoBuffers.length - 1; i > -1; i--) {
        var geometry = this._geoBuffers[i].geometry;
        var level = this._geoBuffers[i].level;
        if (geometry.hasOwnProperty("OBJECTID")) {
          if (this._showBufferIds.indexOf(geometry.OBJECTID) < 0) {
            this._showBufferIds.push(geometry.OBJECTID);
            var symbol;
            if (geometry.type === "polygon") {
              symbol = new SimpleFillSymbol(
                SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(
                  SimpleLineSymbol.STYLE_SOLID,
                  new Color([255, 255, 255, 0.1]),
                  1
                ),
                new Color(this._colors[level])
              );
            } else {
              symbol = new SimpleMarkerSymbol();
            }
            var bufferGraphic = new Graphic(geometry, symbol);
            if (this._showBuffer) {
              this.bufferLayer.add(bufferGraphic);
            }
          }
        }
      }
    },
    clear: function() {
      this.carLayer.clear();
      topic.publish("clearToolTip");
      this._geoBuffers = [];
    },
    _onTopicHandler_clearMonitorControl: function() {
      this._showBufferIds = [];
      this.bufferLayer.clear();
      this.clear();
    }
  });
});
