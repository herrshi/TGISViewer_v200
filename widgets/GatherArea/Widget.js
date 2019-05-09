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

            //this.addGraphics(extent, "area", id); //预计聚集面
            var perx = extent.xmax - extent.xmin;
            var pery = extent.ymax - extent.ymin;
            var per = (perx + pery) / 4.5;
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
                var arrowPoint = new Point([
                  areaPoint.x + per * px,
                  areaPoint.y + per * py
                ]);
                line.addPath([centerPoint, arrowPoint]);
                var angle =
                  Math.atan2(
                    arrowPoint.y - centerPoint.y,
                    arrowPoint.x - centerPoint.x
                  ) *
                  (180 / Math.PI);
                arrowPoint.angle = ((360 - angle + 90) % 360) - px * py * 5;
                console.log(angle);
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
          break;
        case "cararea":
          symbol = this.carSymbol;
          break;
      }
      var graphic = new Graphic(geometry, symbol, {});
      graphic.id = id;
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
    }
  });
});
