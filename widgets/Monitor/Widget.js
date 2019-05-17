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
  "esri/geometry/jsonUtils",
  "jimu/utils",
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
  geometryJsonUtils,
  jimuUtils,
  BaseWidget
) {
  return declare([BaseWidget], {
    bufferLayer: null,
    areaLayer: null,
    carLayer: null,
    _showBuffer: true,
    _objectid: 1,
    _showBufferIds: [],
    _geoBuffers: [],
    _geoBufferIds: [],
    _monitorLayer: null,
    _warnResult: [],
    _highlight: true,
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

      this.areaLayer = new GraphicsLayer();
      this.map.addLayer(this.areaLayer);

      topic.subscribe(
        "MonitorControl",
        lang.hitch(this, this._onTopicHandler_MonitorControl)
      );
      topic.subscribe(
        "clearMonitorControl",
        lang.hitch(this, this._onTopicHandler_clearMonitorControl)
      );
      topic.subscribe(
        "MonitorWarn",
        lang.hitch(this, this._onTopicHandler_MonitorWarn)
      );
      topic.subscribe(
        "showMonitorArea",
        lang.hitch(this, this._onTopicHandler_showMonitorArea)
      );

      topic.subscribe(
        "clearMonitorArea",
        lang.hitch(this, this._onTopicHandler_clearMonitorArea)
      );
    },
    _onTopicHandler_MonitorControl: function(params) {
      var monitorParams = JSON.parse(params.params);

      var callback = params.callback;
      var monitorids = monitorParams.ids || [];

      this.clear();

      var monitorType = monitorParams.monitorType;
      var buffers = monitorParams.buffers || [10000];
      var monitorBuffers = monitorParams.monitorBuffers || undefined;
      var bufferObj = {};
      if (monitorBuffers) {
        for (var a = 0; a < monitorBuffers.length; a++) {
          bufferObj[monitorBuffers[a].id] = monitorBuffers[a].buffer;
        }
      }
      var moitorGraphics = this._GetMonitorGraphics(monitorType, monitorids);
      var bufferGeometrys = [];
      if (moitorGraphics && moitorGraphics.length > 0) {
        for (var i = 0; i < moitorGraphics.length; i++) {
          var moitorGraphic = moitorGraphics[i];

          var bufferGeometry = [];

          var bufferDis = buffers;
          if (bufferObj.hasOwnProperty(moitorGraphic.id)) {
            bufferDis = bufferObj[moitorGraphic.id];
          }
          for (var j = 0; j < bufferDis.length; j++) {
            var buffer = this._doBuffer(moitorGraphic, bufferDis[j], j);
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
      if (callback) {
        callback(this._warnResult);
      }
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
      var limit =
        graphic.attributes.limit == undefined ? 1 : graphic.attributes.limit;
      var bufferPolygon;
      if (bufferDistance > 0 && geometry) {
        //如果是 WGS-84或Web Mercator坐标系，使用geodesicBuffer。其他坐标系使用buffer
        var bufferPolygon =
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
      bufferPolygon.distance = bufferDistance;
      bufferPolygon.limit = limit;
      return bufferPolygon;
    },
    //计算geometry在bufferGeometrys的那个范围
    doMonitorControl: function(geometry, bufferGeometrys, carPoint) {
      var level = 5;
      var temp = 5;
      if (bufferGeometrys && bufferGeometrys.length > 0) {
        for (var i = 0; i < bufferGeometrys.length; i++) {
          var bufferGeometry = bufferGeometrys[i];
          for (var j = 0; j < bufferGeometry.length; j++) {
            if (
              carPoint.hasOwnProperty("monitorids") &&
              carPoint.monitorids.indexOf(bufferGeometry[j].MID) > -1
            ) {
              if (j == 0) {
                var islimit = this._isLimit(
                  bufferGeometry[j],
                  geometry,
                  carPoint.angle || 0
                );
                if (!islimit) {
                  break;
                }
              }
              if (bufferGeometry[j].contains(geometry)) {
                level = j + 1;
                temp = level < temp ? level : temp;
                this._geoBuffers.push({
                  level: j,
                  geometry: bufferGeometry[j]
                });
                this._geoBufferIds.push(bufferGeometry[j].OBJECTID);
                this.GetwarnInfo(carPoint, bufferGeometry[j], level);
                break;
              }
            }
          }
        }
      }
      var imgUrl = "car_blue.png";
      var stateHtml = "";
      switch (temp) {
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
      var angle = carPoint.angle || 0;
      var picSymbol = new PictureMarkerSymbol("images/" + imgUrl, 30, 30)
        .setOffset(0, 15)
        .setAngle(angle);
      attr.state = stateHtml;
      var carGraphic = new Graphic(geometry, picSymbol, attr);
      carGraphic.id = carPoint.id;
      carGraphic.type = carPoint.type;
      this.carLayer.add(carGraphic);

      if (temp < 5) {
        topic.publish("showToolTip", {
          graphic: carGraphic,
          label: "车辆",
          offset: 40
        });
      }
    },
    GetwarnInfo: function(carPoint, bufferGeometry, level) {
      var resultObj = {};
      var state = "";
      var limitstate = "限进";
      var attr = carPoint.fields || {};
      for (var a in attr) {
        resultObj[a] = attr[a];
      }
      resultObj.monitorid = bufferGeometry.MID;
      var limit = bufferGeometry.limit;
      switch (level) {
        case 1:
          state = "红色";
          break;
        case 2:
          state = "橙色";
          break;
        case 3:
          state = "黄色";
          break;
        case 4:
          state = "绿色";
          break;
      }
      switch (limit) {
        case 0:
        case "0":
          limitstate = "限出";
          break;
        case 1:
        case "1":
          limitstate = "限进";
          break;
        case 2:
        case "2":
          limitstate = "限进限出";
          break;
      }
      resultObj.limit = limitstate;
      resultObj.state = state;
      this._warnResult.push(resultObj);
    },
    showBufferArea: function() {
      this._geoBuffers.sort(function(a, b) {
        return a.level - b.level;
      });
      var clearBufferids = []; //需要清理的id;
      //清除车辆已经离开的预警区域
      if (this._geoBuffers.length == 0) {
        this.bufferLayer.clear();
        this._showBufferIds = [];
      } else {
        if (this._showBufferIds.length > 0) {
          for (var j = 0; j < this._showBufferIds.length; j++) {
            if (this._geoBufferIds.indexOf(this._showBufferIds[j]) < 0) {
              clearBufferids.push(this._showBufferIds[j]);
            }
          }
          this.clearShowBuffer(clearBufferids);
        }
      }
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
            bufferGraphic.OBJECTID = geometry.OBJECTID;
            if (this._showBuffer) {
              this.bufferLayer.add(bufferGraphic);
            }
          }
        }
      }
    },
    clearShowBuffer: function(ids) {
      var removeGraphics = [];
      if (ids) {
        array.forEach(
          this.bufferLayer.graphics,
          lang.hitch(this, function(graphic) {
            if (graphic.OBJECTID && ids.indexOf(graphic.OBJECTID) > -1) {
              removeGraphics.push(graphic);
              this._showBufferIds.splice(
                this._showBufferIds.indexOf(graphic.OBJECTID),
                1
              );
            }
          })
        );
        if (removeGraphics.length > 0) {
          array.forEach(
            removeGraphics,
            lang.hitch(this, function(graphic) {
              this.bufferLayer.remove(graphic);
            })
          );
        }
      }
    },
    clear: function() {
      this.carLayer.clear();
      this.areaLayer.clear();
      topic.publish("clearToolTip");
      this._geoBuffers = [];
      this._geoBufferIds = [];
      this._warnResult = [];
    },
    _onTopicHandler_clearMonitorControl: function() {
      this.bufferLayer.clear();
      this._showBufferIds = [];
      this.clear();
    },
    _onTopicHandler_showMonitorArea: function(params) {
      var monitorParams = JSON.parse(params);
      var id = monitorParams.id || "";

      //this.areaLayer.clear();
      this._onTopicHandler_clearMonitorArea([id]);

      var geometryObj = monitorParams.geometry;
      var buffers = monitorParams.buffers || [10000];

      var geometry = geometryJsonUtils.fromJson(geometryObj);
      if (this.map.spatialReference.isWebMercator()) {
        geometry = WebMercatorUtils.geographicToWebMercator(geometry);
      }
      var bufferGeometrys;
      var fields = {};
      fields.id = id;
      var fillsymbol = new SimpleFillSymbol(
        SimpleFillSymbol.STYLE_SOLID,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color([0, 255, 255, 1]),
          2
        ),
        new Color([0, 255, 255, 0])
      );

      var moitorGraphic = new Graphic(geometry, fillsymbol, fields);
      moitorGraphic.id = id;
      for (var j = buffers.length - 1; j > -1; j--) {
        var buffer = this._doBuffer(moitorGraphic, buffers[j], j);

        var symbol = new SimpleFillSymbol(
          SimpleFillSymbol.STYLE_SOLID,
          new SimpleLineSymbol(
            SimpleLineSymbol.STYLE_SOLID,
            new Color([255, 255, 255, 0.1]),
            1
          ),
          new Color(this._colors[j])
        );
        var bufferGraphic = new Graphic(buffer, symbol, fields);
        bufferGraphic.id = id + j;
        bufferGraphic.pid = id;
        this.areaLayer.add(bufferGraphic);
      }
      //this.areaLayer.add(moitorGraphic);
    },
    _onTopicHandler_clearMonitorArea: function(params) {
      var ids = params || undefined;
      var removeGraphics = [];
      if (ids) {
        array.forEach(
          this.areaLayer.graphics,
          lang.hitch(this, function(graphic) {
            if (graphic.pid && ids.indexOf(graphic.pid) > -1) {
              removeGraphics.push(graphic);
            }
          })
        );
        if (removeGraphics.length > 0) {
          array.forEach(
            removeGraphics,
            lang.hitch(this, function(graphic) {
              this.areaLayer.remove(graphic);
            })
          );
        }
      } else {
        this.areaLayer.clear();
      }
    },
    //区域,车辆坐标,车辆角度
    //limit,0限出,1限进,2限进限出,-1不限制,undefined限进,默认值.
    _isLimit: function(geometry, carpoint, angle) {
      if (geometry.limit == 2 || geometry.limit == "2") {
        return true;
      }
      if (geometry.limit == -1 || geometry.limit == "-1") {
        return false;
      }
      var wgsgeo;
      if (geometry.spatialReference.isWebMercator()) {
        wgsgeo = WebMercatorUtils.webMercatorToGeographic(geometry);
      }
      var isenter = false;
      var islimit = false;
      var center = jimuUtils.getGeometryCenter(wgsgeo);
      var cx = center.x - carpoint.x;
      var cy = center.y - carpoint.y;
      var atan = Math.atan2(cy, cx) * (180 / Math.PI);
      var atan2 = (360 - atan + 90) % 360;
      console.log(atan + "," + atan2 + "," + angle);
      angle = (angle + 360) % 360;
      if (Math.abs(atan2 - angle) < 45) {
        isenter = true;
      } else if (cx >= 0 && cy > 0) {
        //第一象限
        if (cx == 0) {
          if ((angle >= 0 && angle <= 90) || (angle >= 180 && angle < 360)) {
            isenter = true;
          }
        } else {
          if (angle >= 0 && angle <= 90) {
            isenter = true;
          }
        }
      } else if (cx <= 0 && cy > 0) {
        //第二象限
        if (cx == 0) {
          if (angle >= 90 && angle <= 270) {
            isenter = true;
          }
        } else {
          if ((angle >= 270 && angle < 360) || angle == 0) {
            isenter = true;
          }
        }
      } else if (cx < 0 && cy <= 0) {
        //第三象限
        atan = atan + 180;
        if (cy == 0) {
          if ((angle >= 180 && angle < 360) || angle == 0) {
            isenter = true;
          }
        } else {
          if (angle >= 180 && angle <= 270) {
            isenter = true;
          }
        }
      } else if (cx > 0 && cy <= 0) {
        //第四象限
        atan = atan + 180;
        if (cy == 0) {
          if (angle >= 0 && angle <= 180) {
            isenter = true;
          }
        } else {
          if (angle >= 90 && angle <= 180) {
            isenter = true;
          }
        }
      }

      if ((geometry.limit == 1 || geometry.limit == "1") && isenter) {
        //限制进入
        islimit = true;
      }
      if ((geometry.limit == 0 || geometry.limit == "0") && !isenter) {
        //需要出去
        islimit = true;
      }
      return islimit;
    },

    _onTopicHandler_MonitorWarn: function(params) {
      var monitorParams = JSON.parse(params.params);
      var callback = params.callback;
      this._warnResult = [];
      this._geoBuffers = [];

      array.forEach(
        monitorParams,
        function(monitor) {
          var areas = monitor.area;

          areas.sort(function(a, b) {
            return Number(a.level) - Number(b.level);
          });
          var highlight = monitor.highlight;
          var carpoints = monitor.carpoints;
          array.forEach(
            carpoints,
            function(car) {
              var point = new Point([car.x, car.y]);
              var flag = false;
              var areageometry;
              if (car.limit == "1" || car.limit == 1) {
                //限进,1
                for (var i = 0; i < areas.length; i++) {
                  var area = areas[i];
                  areageometry = geometryJsonUtils.fromJson(area.geometry);
                  var level = area.level;
                  areageometry.id = area.id;
                  areageometry.level = level;

                  if (areageometry.contains(point)) {
                    this._geoBuffers.push({
                      level: level,
                      geometry: areageometry,
                      limit: "1",
                      id: area.id,
                      type: area.type,
                      highlight: highlight != false
                    });
                    this.doCarGraphic(areageometry, car, level, 1);
                    flag = true;
                    break;
                  }
                }
                if (!flag) {
                  this.doCarGraphic(areageometry, car, 0, 1);
                }
              }
              if (car.limit == "0" || car.limit == 0) {
                //限出,0
                var areatemp;
                var areageotemp;
                var leveltemp;
                for (var i = 0; i < areas.length; i++) {
                  var area = areas[i];
                  areageometry = geometryJsonUtils.fromJson(area.geometry);
                  var level = area.level;
                  areageometry.id = area.id;
                  areageometry.level = level;

                  if (!areageometry.contains(point)) {
                    areatemp = area;
                    areageotemp = areageometry;
                    leveltemp = level;
                  } else {
                    break;
                  }
                }
                if (areatemp) {
                  this._geoBuffers.push({
                    level: leveltemp,
                    geometry: areageotemp,
                    limit: "0",
                    id: areatemp.id,
                    type: areatemp.type,
                    highlight: highlight != false
                  });
                  this.doCarGraphic(areageotemp, car, 5 - leveltemp, 0);
                } else {
                  this.doCarGraphic(areageometry, car, 0, 0); //包含在最里面
                }
              }
            },
            this
          );
        },
        this
      );

      this.showWarnArea();
      if (callback) {
        callback(this._warnResult);
      }
    },
    doCarGraphic: function(areaGeo, car, level, limit) {
      var imgUrl = "car_blue.png";
      var stateHtml = "";
      var state = "";
      var areacenter = jimuUtils.getGeometryCenter(areaGeo);
      switch (level.toString()) {
        case "1":
          imgUrl = "car_red.png";
          state = "红色";
          stateHtml = "<font  color='red'>红色</font>";
          break;
        case "2":
          imgUrl = "car_orange.png";
          state = "橙色";
          stateHtml = "<font  color='orange'>橙色</font>";
          break;
        case "3":
          imgUrl = "car_yellow.png";
          state = "黄色";
          stateHtml = "<font  color='yellow'>黄色</font>";
          break;
        case "4":
          imgUrl = "car_green.png";
          state = "绿色";
          stateHtml = "<font  color='green'>绿色</font>";
          break;
      }
      var attr = car.fields || {};

      var limitState = limit.toString() == "1" ? "限进" : "限出";
      attr.limit = limitState;
      var resultObj = {};
      for (var str in attr) {
        resultObj[str] = attr[str];
      }
      resultObj.carid = car.id;
      resultObj.state = state;
      resultObj.areaid = areaGeo.id;
      resultObj.level = areaGeo.level;
      this._warnResult.push(resultObj);

      var carpoint = new Point([car.x, car.y]);
      var angle = this.doarrowAngle(carpoint, areacenter, limit);

      var picSymbol = new PictureMarkerSymbol(
        window.path + "images/" + imgUrl,
        30,
        30
      )
        .setOffset(0, 15)
        .setAngle(angle);
      attr.state = stateHtml;

      var carGraphic = new Graphic(carpoint, picSymbol, attr);
      carGraphic.id = car.id;
      carGraphic.type = car.type;
      this.addCar(carGraphic);

      if (level > 0) {
        topic.publish("showToolTip", {
          graphic: carGraphic,
          label: limitState + "车辆",
          id: car.id,
          offset: 40
        });
      }
      this.carLayer.add(carGraphic);
    },
    addCar: function(car) {
      for (var i = 0; i < this.carLayer.graphics.length; i++) {
        var graphic = this.carLayer.graphics[i];
        if (graphic.id && graphic.id === car.id) {
          this.carLayer.remove(graphic);
          topic.publish("clearToolTip", [car.id]);
          i--;
        }
      }
      this.carLayer.add(car);
    },
    showWarnArea: function() {
      this._geoBuffers.sort(function(a, b) {
        return a.level - b.level;
      });
      for (var i = this._geoBuffers.length - 1; i > -1; i--) {
        var area = this._geoBuffers[i];
        var geometry = area.geometry;
        var level = area.level;
        if (area.hasOwnProperty("id")) {
          if (this._showBufferIds.indexOf(area.id) < 0) {
            this._showBufferIds.push(area.id);
            var symbol = new SimpleFillSymbol(
              SimpleFillSymbol.STYLE_SOLID,
              new SimpleLineSymbol(
                SimpleLineSymbol.STYLE_SOLID,
                new Color([255, 255, 255, 0.1]),
                1
              ),
              new Color(this._colors[level - 1])
            );
            var bufferGraphic = new Graphic(geometry, symbol);
            bufferGraphic.id = area.id;
            this.bufferLayer.add(bufferGraphic);
            if (area.highlight) {
              var node = bufferGraphic.getNode();
              node.setAttribute("data-highlight", "highlight");
              setTimeout(function() {
                node.setAttribute("data-highlight", "");
              }, 5000);
            }
          }
        }
      }
    },
    //车辆角度
    doarrowAngle: function(p1, p2, limit) {
      if (p2.x - p1.x == 0) {
        return 90;
      }
      if (p2.y - p1.y == 0) {
        return 0;
      }
      var angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
      var px = 1,
        py = 1;
      if (p2.x > p1.x) {
        px = -1;
      }
      if (p2.y > p1.y) {
        py = -1;
      }
      return ((360 - angle + 90) % 360) - px * py * 15 + 180 * limit + 180; //减去修正值
    }
  });
});
