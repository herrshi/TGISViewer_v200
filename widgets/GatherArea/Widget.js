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
  "esri/geometry/Point",
  "esri/geometry/Polyline",
  "esri/geometry/Circle",
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
  "esri/Color",
  "esri/InfoTemplate",
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
  Point,
  Polyline,
  Circle,
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
  Color,
  InfoTemplate
) {
  return declare([BaseWidget], {
    name: "cluster",
    gatherLayer: [],
    pointSymbol: null,
    arrowSymbol: null,
    carPointSymbol: null,
    carSymbol: null,
    areaSymbol: null,
    dashSymbol: null,
    postCreate: function() {
      this.inherited(arguments);
      this.gatherLayer = new GraphicsLayer();
      this.map.addLayer(this.gatherLayer);
      this.pointSymbol = new SimpleMarkerSymbol(
        SimpleMarkerSymbol.STYLE_CIRCLE,
        10,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color([255, 0, 0.1]),
          1
        ),
        new Color([255, 0, 0, 1])
      );
      //this.arrowSymbol =
      this.carPointSymbol = new PictureMarkerSymbol(
        "images/car_blue.png",
        30,
        30
      ).setOffset(0, 15);
      this.dashSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_DASH,
        new Color([255, 0, 0, 1]),
        3
      );
      this.carSymbol = new SimpleFillSymbol(
        SimpleFillSymbol.STYLE_SOLID,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color([128, 128, 128, 1]),
          1
        ),
        new Color([213, 231, 237, 0.5])
      );

      this.areaSymbol = new SimpleFillSymbol(
        SimpleFillSymbol.STYLE_SOLID,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_DASH,
          new Color([255, 0, 0, 1]),
          1
        ),
        new Color([255, 0, 0, 0.5])
      );
      topic.subscribe(
        "addGatherArea",
        lang.hitch(this, this.onTopicHandler_addGatherArea)
      );
      topic.subscribe(
        "deleteGatherArea",
        lang.hitch(this, this.onTopicHandler_deleteGatherArea)
      );
    },
    onTopicHandler_addGatherArea: function(params) {
      var gatherParams = JSON.parse(params);
      if (gatherParams && gatherParams.length > 0) {
        array.forEach(
          gatherParams,
          function(gatherObj) {
            var forecastarea = gatherObj.forecastarea;
            var id = gatherObj.id;
            var carareas = gatherObj.carareas;

            var areageometryObj = forecastarea.geometry;
            var areageometry;
            if (areageometryObj.center) {
              areageometry = new Circle(areageometryObj.center, {
                radius: areageometryObj.radius,
                geodesic: true
              });
            } else {
              areageometry = geometryJsonUtils.fromJson(areageometryObj);
            }

            var areaPoint = jimuUtils.getGeometryCenter(areageometry);
            this.addGraphics(areageometry, "area", id); //预计聚集面

            var extent = areageometry.getExtent();

            var radius = (extent.xmax - extent.xmin) / 2;

            array.forEach(
              carareas,
              function(carcarea) {
                var cargeometryObj = carcarea.geometry;
                var cargeometry;

                if (cargeometryObj.center) {
                  cargeometry = new Circle(cargeometryObj.center, {
                    radius: cargeometryObj.radius,
                    geodesic: true
                  });
                } else {
                  cargeometry = geometryJsonUtils.fromJson(cargeometryObj);
                }

                var centerPoint = jimuUtils.getGeometryCenter(cargeometry);

                var carpoints = carcarea.carpoints;
                this.addGraphics(cargeometry, "cararea", id); //车辆聚集面
                array.forEach(
                  carpoints,
                  function(car) {
                    var point = new Point([car.x, car.y]);
                    this.addGraphics(point, "carpoint", id); //车辆点
                  },
                  this
                );
                var line = new Polyline();
                var px = 1,
                  py = 1;
                if (areaPoint.x > centerPoint.x) {
                  px = -1;
                }
                if (areaPoint.y > centerPoint.y) {
                  py = -1;
                }
                var len = this.getLength(areaPoint, centerPoint);

                var per = radius / len;
                if (per > 1) {
                  per = 0.8;
                } else {
                  per = per * 1.1;
                }
                var perx = (centerPoint.x - areaPoint.x) * per;
                var pery = (centerPoint.y - areaPoint.y) * per;
                var arrowPoint = new Point([
                  areaPoint.x + perx,
                  areaPoint.y + pery
                ]);
                //曲线
                // var path = this.doBezierCurve(centerPoint, arrowPoint);
                // line.addPath(path);
                //直线
                line.addPath([centerPoint, arrowPoint]);
                var angle = this.doarrowAngle(centerPoint, arrowPoint);
                arrowPoint.angle = angle;
                this.addGraphics(line, "polyline", id); //箭头线
                this.addGraphics(centerPoint, "point", id); //箭头点
                this.addGraphics(arrowPoint, "arrowpoint", id); //箭头三角
              },
              this
            );
          },
          this
        );
      }
    },
    addGraphics: function(geometry, type, id) {
      var symbol;
      var gtype = "";
      switch (type) {
        case "point":
          symbol = this.pointSymbol;
          break;
        case "arrowpoint":
          symbol = new SimpleMarkerSymbol(
            SimpleMarkerSymbol.STYLE_PATH,
            16,
            new SimpleLineSymbol(
              SimpleLineSymbol.STYLE_SOLID,
              new Color([255, 0, 0.1]),
              1
            ),
            new Color([255, 0, 0, 1])
          )
            .setPath("M0 16 L 10 16 L5 0z")
            .setAngle(geometry.angle);
          break;
        case "carpoint":
          symbol = this.carPointSymbol;
          break;
        case "polyline":
          symbol = this.dashSymbol;
          break;
        case "area":
          symbol = this.areaSymbol;
          gtype = "GatherArea";
          break;
        case "cararea":
          symbol = this.carSymbol;
          gtype = "CarArea";
          break;
      }
      var graphic = new Graphic(geometry, symbol, {});
      graphic.id = id;
      graphic.type = gtype;
      this.gatherLayer.add(graphic);
    },
    onTopicHandler_deleteGatherArea: function(params) {
      var ids = params;
      if (ids && ids.length > 0) {
        array.forEach(
          params,
          function(id) {
            for (var i = 0; i < this.gatherLayer.graphics.length; i++) {
              var graphic = this.gatherLayer.graphics[i];
              if (graphic.id === id) {
                this.gatherLayer.remove(graphic);
                i--;
              }
            }
          },
          this
        );
      } else {
        this.gatherLayer.clear();
      }
    },
    //p0为开始点,p2为终点,带箭头,画贝塞尔曲线
    doBezierCurve: function(p0, p2) {
      //var p1 = new Point([p0.x, p2.y]); //[p2.x,p0.y]
      var raddir = -1; //弧度方向1,向上;-1向下
      var rad = 4; //弧度
      var px = 1,
        py = 1;
      if (p2.x > p0.x) {
        px = -1;
      }
      if (p2.y > p0.y) {
        py = -1;
      }
      var up = px* raddir; //弧度向上px*py*dir,一致方向;px  * raddir根据x来
      console.log(px * py);
      var path = [];
      var p1;
      var pcenter = new Point([(p0.x + p2.x) / 2, (p0.y + p2.y) / 2]);

      if (p2.x - p0.x == 0) {
        p1 = new Point([p0.x - (up * Math.abs(p2.y - p0.y)) / 2, pcenter.y]);
      } else if (p2.y - p0.y == 0) {
        p1 = new Point([pcenter.x, p0.y + (up * Math.abs(p2.x - p0.x)) / 2]);
      } else {
        var k = -1 / ((p2.y - p0.y) / (p2.x - p0.x));
        var b = pcenter.y - k * pcenter.x;
        var x = pcenter.x - (up * Math.abs(pcenter.x - p0.x)) / rad;
        p1 = new Point([x, k * x + b]);
      }

      p2.angle = this.doarrowAngle(p1, p2);

      path.push(p0);
      for (var i = 1; i < 100; i++) {
        var t = i / 100;
        var x =
          (1 - t) * (1 - t) * p0.x + 2 * t * (1 - t) * p1.x + t * t * p2.x;
        var y =
          (1 - t) * (1 - t) * p0.y + 2 * t * (1 - t) * p1.y + t * t * p2.y;
        var p = new Point([x, y]);
        path.push(p);
      }
      path.push(p2);
      return path;
    },
    //箭头角度
    doarrowAngle: function(p1, p2) {
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
      return ((360 - angle + 90) % 360) - px * py * 5; //减去修正值
    },
    getLength: function(p1, p2) {
      return Math.sqrt(
        (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y)
      );
    }
  });
});
