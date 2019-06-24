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
    name: "MigrateCharts",
    gatherLayer: [],
    pointSymbol: null,
    arrowSymbol: null,
    carPointSymbol: null,
    carSymbol: null,
    areaSymbol: null,
    dashSymbol: null,
    lineSymbol: null,
    postCreate: function() {
      this.inherited(arguments);
      this.gatherLayer = new GraphicsLayer({ id: "migratechart" });
      this.map.addLayer(this.gatherLayer);
      this.pointSymbol = new SimpleMarkerSymbol(
        SimpleMarkerSymbol.STYLE_CIRCLE,
        8,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color([255, 0, 0]),
          4
        ),
        new Color([255, 0, 0, 0.2])
      );
      //this.arrowSymbol =
      this.carPointSymbol = new PictureMarkerSymbol(
        window.path + "images/car_blue.png",
        15,
        15
      ).setOffset(0, 15);
      this.dashSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([255, 255, 255, 1]),
        3
      );
      this.lineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([255, 215, 0, 0.8]),
        3
      );
      this.carSymbol = new SimpleFillSymbol(
        SimpleFillSymbol.STYLE_SOLID,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color([255, 105, 180, 0.2]),
          1
        ),
        new Color([255, 105, 180, 0.2])
      );

      this.areaSymbol = new SimpleFillSymbol(
        SimpleFillSymbol.STYLE_SOLID,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color([0, 255, 255, 0.8]),
          1
        ),
        new Color([0, 255, 255, 0.8])
      );
      topic.subscribe(
        "showMigrateCharts",
        lang.hitch(this, this.onTopicHandler_showMigrateCharts)
      );
    },
    onTopicHandler_showMigrateCharts: function(params) {
      var chartParams = JSON.parse(params);
      if (chartParams && chartParams.length > 0) {
        array.forEach(
          chartParams,
          function(ChartObj) {
            var startPoint = ChartObj.startPoint;
            this.addGraphics(
              new Point([startPoint.x, startPoint.y]),
              "point",
              "01"
            );
            var endPoints = ChartObj.endPoints;
            array.forEach(
              endPoints,
              function(endPoint) {
                var point = new Point([endPoint.x, endPoint.y]);
                this.addGraphics(point, "point", "01");

                var line = new Polyline();
                var path = this.doBezierCurve(
                  { x: startPoint.x, y: startPoint.y },
                  endPoint
                );
                line.addPath(path);

                this.addGraphics(line, "polyline2", "01"); //箭头线

                this.addGraphics(line, "polyline", "01"); //箭头线
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
          geometry = new Circle(geometry, {
            radius: 1000
          });
          symbol = this.areaSymbol;
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
            new Color([255, 0, 0, 0.5])
          )
            .setPath("M0 16 L 10 16 L5 0z")
            .setAngle(geometry.angle);
          break;
        case "carpoint":
          symbol = new PictureMarkerSymbol(
            window.path + "images/car_blue.png",
            15,
            15
          )
            .setOffset(0, 15)
            .setAngle(geometry.angle);
          break;
        case "polyline":
          symbol = this.dashSymbol;
          break;
        case "polyline2":
          symbol = this.lineSymbol;
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
    //p0为开始点,p2为终点,带箭头,画贝塞尔曲线
    doBezierCurve: function(p0, p2) {
      //var p1 = new Point([p0.x, p2.y]); //[p2.x,p0.y]

      var raddir = -1; //弧度方向1,向上;-1向下

      this.doOffset(p0, p2, raddir);

      var rad = 1.8; //弧度
      var px = 1,
        py = 1;
      if (p2.x > p0.x) {
        px = -1;
      }
      if (p2.y > p0.y) {
        py = -1;
      }
      var up = px * py * raddir; //弧度向上px*py*dir,一致方向;px  * raddir根据x来

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
        var x =
          pcenter.x - (up * Math.abs(pcenter.x - p0.x)) / (rad * Math.abs(k));
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
        if (p2.y - p1.y > 0) {
          return 0;
        } else {
          return 180;
        }
      }
      if (p2.y - p1.y == 0) {
        if (p2.x - p1.x > 0) {
          return 90;
        } else {
          return 270;
        }
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
    },
    doOffset: function(p0, p2, rad) {
      var ang;
      var dir = 0.012;
      try {
        var _k = (p2.y - p0.y) / (p2.x - p0.x);
        ang = Math.atan(_k);
      } catch (e) {
        if (p2.y > p0.y) {
          ang = 90;
        } else {
          ang = 270;
        }
      }
      if (rad > 0) {
        if (p0.x < p2.x) {
          p0.x += dir * Math.cos(ang + Math.PI / 4);
          p0.y += dir * Math.sin(ang + Math.PI / 4);

          p2.x += dir * Math.cos(ang + (Math.PI * 3) / 4);
          p2.y += dir * Math.sin(ang + (Math.PI * 3) / 4);
        } else {
          p2.x += dir * Math.cos(ang + Math.PI / 4);
          p2.y += dir * Math.sin(ang + Math.PI / 4);

          p0.x += dir * Math.cos(ang + (Math.PI * 3) / 4);
          p0.y += dir * Math.sin(ang + (Math.PI * 3) / 4);
        }
      } else {
        if (p0.x < p2.x) {
          p0.x += -dir * Math.cos(ang + (Math.PI * 3) / 4);
          p0.y += -dir * Math.sin(ang + (Math.PI * 3) / 4);

          p2.x += dir * Math.cos(ang + (Math.PI * 5) / 4);
          p2.y += dir * Math.sin(ang + (Math.PI * 5) / 4);
        } else {
          p2.x += -dir * Math.cos(ang + (Math.PI * 3) / 4);
          p2.y += -dir * Math.sin(ang + (Math.PI * 3) / 4);

          p0.x += dir * Math.cos(ang + (Math.PI * 5) / 4);
          p0.y += dir * Math.sin(ang + (Math.PI * 5) / 4);
        }
      }
    }
  });
});
