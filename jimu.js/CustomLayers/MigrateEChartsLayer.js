define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "esri/geometry/Point",
  "esri/geometry/ScreenPoint",
  "esri/geometry/webMercatorUtils",
  "esri/SpatialReference"
], function(
  declare,
  lang,
  Point,
  ScreenPoint,
  WebMercatorUtils,
  SpatialReference
) {
  return declare("MigrateEchartsLayer", null, {
    name: "MigrateEchartsLayer",
    _map: null,
    _ec: null,
    _geoCoord: [],
    _option: null,
    _mapOffset: [25, 25],
    constructor: function(map, ec) {
      this._map = map;
      var div = (this._echartsContainer = document.createElement("div"));
      div.style.position = "absolute";
      div.style.height = map.height + "px";
      div.style.width = map.width + "px";
      div.style.top = 0 + "px";
      div.style.left = 0 + "px";
      div.style.pointerEvents = "none";
      //div.style.backgroundColor="rgba(255,255,255,0)";
      //$( map.__container).prepend($(div));
      this._map.__container.appendChild(div);
      this._init(map, ec);
    },
    _init: function(map, ec) {
      var self = this;
      self._map = map;
      //初始化mapoverlay
      /**
       * 获取echarts容器
       *
       * @return {HTMLElement}
       * @public
       */
      self.getEchartsContainer = function() {
        return self._echartsContainer;
      };

      /**
       * 获取map实例
       *
       * @return {map.Map}
       * @public
       */
      self.getMap = function() {
        return self._map;
      };
      /**
       * 经纬度转换为屏幕像素
       *
       * @param {Array.<number>} geoCoord  经纬度
       * @return {Array.<number>}
       * @public
       */
      self.geoCoord2Pixel = function(geoCoord) {
        if (geoCoord != null && geoCoord != undefined && geoCoord.length > 0) {
          var point = new Point(geoCoord[0], geoCoord[1]);
          var pos = self._map.toScreen(point);
          return [pos.x, pos.y];
        } else {
          return null;
        }
      };

      /**
       * 屏幕像素转换为经纬度
       *
       * @param {Array.<number>} pixel  像素坐标
       * @return {Array.<number>}
       * @public
       */
      self.pixel2GeoCoord = function(pixel) {
        var point = self._map.toMap(new ScreenPoint(pixel[0], pixel[1]));
        return [point.lng, point.lat];
      };

      /**
       * 初始化echarts实例
       *
       * @return {ECharts}
       * @public
       */
      self.initECharts = function() {
        self._ec = ec.init.apply(self, arguments);
        self._bindEvent();
        self._addMarkWrap();
        return self._ec;
      };

      // addMark wrap for get position from baidu map by geo location
      // by kener at 2015.01.08
      self._addMarkWrap = function() {
        function _addMark(seriesIdx, markData, markType) {
          var data;
          if (markType == "markPoint") {
            var data = markData.data;
            if (data && data.length) {
              for (var k = 0, len = data.length; k < len; k++) {

                if (
                  !(data[k].name && this._geoCoord.hasOwnProperty(data[k].name))
                ) {
                  data[k].name = k + "markp";
                  self._geoCoord[data[k].name] = data[k].geoCoord;
                }
                self._AddPos(data[k], 0, 0);
              }
            }
          } else {
            data = markData.data;
            if (data && data.length) {
              for (var k = 0, len = data.length; k < len; k++) {
                if (
                  !(
                    data[k][0].name &&
                    this._geoCoord.hasOwnProperty(data[k][0].name)
                  )
                ) {
                  data[k][0].name = k + "startp";
                  self._geoCoord[data[k][0].name] = data[k][0].geoCoord;
                }
                if (
                  !(
                    data[k][1].name &&
                    this._geoCoord.hasOwnProperty(data[k][1].name)
                  )
                ) {
                  data[k][1].name = k + "endp";
                  self._geoCoord[data[k][1].name] = data[k][1].geoCoord;
                }
                var obj0 = data[k][0];
                var obj1 = data[k][1];
                var coord0 = self._geoCoord[obj0.name][0];
                var coord1 = self._geoCoord[obj1.name][0];
                var ang;
                try {
                  var _k = (coord1[1] - coord0[1]) / (coord1[0] - coord0[0]);
                  ang = Math.atan(_k);
                } catch (e) {
                  if (coord1[1] > coord0[1]) {
                    ang = 90;
                  } else {
                    ang = 270;
                  }
                }
                if (coord0[0] < coord1[0]) {
                  self._AddPos(
                    data[k][0],
                    1 * Math.cos(ang + Math.PI / 4),
                    -1 * Math.sin(ang + Math.PI / 4)
                  );
                  self._AddPos(
                    data[k][1],
                    1 * Math.cos(ang + (Math.PI * 3) / 4),
                    -1 * Math.sin(ang + (Math.PI * 3) / 4)
                  );
                } else {
                  self._AddPos(
                    data[k][0],
                    -1 * Math.cos(ang + Math.PI / 4),
                    1 * Math.sin(ang + Math.PI / 4)
                  );
                  self._AddPos(
                    data[k][1],
                    -1 * Math.cos(ang + (Math.PI * 3) / 4),
                    1 * Math.sin(ang + (Math.PI * 3) / 4)
                  );
                }
              }
            }
          }
          self._ec._addMarkOri(seriesIdx, markData, markType);
        }

        self._ec._addMarkOri = self._ec._addMark;
        self._ec._addMark = _addMark;
      };

      /**
       * 获取ECharts实例
       *
       * @return {ECharts}
       * @public
       */
      self.getECharts = function() {
        return self._ec;
      };

      /**
       * 获取地图的偏移量
       *
       * @return {Array.<number>}
       * @public
       */
      self.getMapOffset = function() {
        return self._mapOffset;
      };

      /**
       * 对echarts的setOption加一次处理
       * 用来为markPoint、markLine中添加x、y坐标，需要name与geoCoord对应
       *
       * @public
       * @param option
       * @param notMerge
       */
      self.setOption = function(option, notMerge) {
        self._option = option;
        //为空时return;
        if (!option) {
          return;
        }
        var series = option.series || {};

        // 记录所有的geoCoord
        for (var i = 0, item; (item = series[i++]); ) {
          var geoCoord = item.geoCoord;
          if (geoCoord) {
            for (var k in geoCoord) {
              self._geoCoord[k] = geoCoord[k];
            }
          }
        }

        // 添加x、y
        for (var i = 0, item; (item = series[i++]); ) {
          var markPoint = item.markPoint || {};
          var markLine = item.markLine || {};

          var data = markPoint.data;
          if (data && data.length) {
            for (var k = 0, len = data.length; k < len; k++) {

              if (
                !(data[k].name && this._geoCoord.hasOwnProperty(data[k].name))
              ) {
                data[k].name = k + "markp";
                self._geoCoord[data[k].name] = data[k].geoCoord;
              }
              self._AddPos(data[k], 0, 0);
            }
          }

          data = markLine.data;
          if (data && data.length) {
            for (var k = 0, len = data.length; k < len; k++) {
              if (
                !(
                  data[k][0].name &&
                  this._geoCoord.hasOwnProperty(data[k][0].name)
                )
              ) {
                data[k][0].name = k + "startp";
                self._geoCoord[data[k][0].name] = data[k][0].geoCoord;
              }
              if (
                !(
                  data[k][1].name &&
                  this._geoCoord.hasOwnProperty(data[k][1].name)
                )
              ) {
                data[k][1].name = k + "endp";
                self._geoCoord[data[k][1].name] = data[k][1].geoCoord;
              }
              var obj0 = data[k][0];
              var obj1 = data[k][1];
              var coord0 = self._geoCoord[obj0.name][0];
              var coord1 = self._geoCoord[obj1.name][0];
              var ang;
              try {
                var _k = (coord1[1] - coord0[1]) / (coord1[0] - coord0[0]);
                ang = Math.atan(_k);
              } catch (e) {
                if (coord1[1] > coord0[1]) {
                  ang = 90;
                } else {
                  ang = 270;
                }
              }
              if (coord0[0] < coord1[0]) {
                self._AddPos(
                  data[k][0],
                  1 * Math.cos(ang + Math.PI / 4),
                  -1 * Math.sin(ang + Math.PI / 4)
                );
                self._AddPos(
                  data[k][1],
                  1 * Math.cos(ang + (Math.PI * 3) / 4),
                  -1 * Math.sin(ang + (Math.PI * 3) / 4)
                );
              } else {
                self._AddPos(
                  data[k][0],
                  -1 * Math.cos(ang + Math.PI / 4),
                  1 * Math.sin(ang + Math.PI / 4)
                );
                self._AddPos(
                  data[k][1],
                  -1 * Math.cos(ang + (Math.PI * 3) / 4),
                  1 * Math.sin(ang + (Math.PI * 3) / 4)
                );
              }
            }
          }
        }

        self._ec.setOption(option, notMerge);
      };

      /**
       * 增加x、y坐标
       *
       * @param {Object} obj  markPoint、markLine data中的项，必须有name
       * @param {Object} geoCoord
       */
      self._AddPos = function(obj, offsetx, offsety) {
        var coord = self._geoCoord[obj.name];
        var pos = self.geoCoord2Pixel(coord);
        if (pos != null) {
          obj.x = pos[0] + offsetx * self._mapOffset[0];
          obj.y = pos[1] + offsety * self._mapOffset[1];
        }
      };

      /**
       * 绑定地图事件的处理方法
       *
       * @private
       */
      self._bindEvent = function() {
        self._map.on("zoom-end", function(e) {
          self.setOption(self._option);
        });
        self._map.on("zoom-start", function(e) {
          self._ec.clear();
        });
        self._map.on("pan", function(e) {
          self._ec.clear();
        });
        self._map.on("pan-end", function(e) {
          self.setOption(self._option);
        });

        self._ec.getZrender().on("dragstart", function(e) {
          self._map.disablePan();
          //self._ec.clear();
        });
        self._ec.getZrender().on("dragend", function(e) {
          self._map.enablePan();
          //self.setOption(self._option);
        });
        self._ec.getZrender().on("mousewheel", function(e) {
          self._ec.clear();
          self._map.emit("mouse-wheel", e.event);
        });
      };
    }
  });
});
