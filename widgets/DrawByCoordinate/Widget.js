define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/dom-class",
  "dojo/on",
  "dojo/query",
  "jimu/BaseWidget",
  "esri/geometry/Point",
  "esri/geometry/Polyline",
  "esri/geometry/Polygon",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/graphic",
  "esri/layers/GraphicsLayer",
  "esri/InfoTemplate"
], function(
  declare,
  lang,
  domClass,
  on,
  query,
  BaseWidget,
  Point,
  Polyline,
  Polygon,
  PictureMarkerSymbol,
  SimpleLineSymbol,
  SimpleFillSymbol,
  Graphic,
  GraphicsLayer,
  InfoTemplate
) {
  return declare([BaseWidget], {
    name: "DrawByCoordinate",
    baseClass: "jimu-widget-drawByCoordinate",

    _activeClass: "jimu-state-active",
    _currentType: "point",

    _pointSymbol: null,
    _lineSymbol: null,
    _polygonSymbol: null,

    _pointLayer: null,
    _lineLayer: null,
    _polygonLayer: null,

    _xFieldNames: ["x", "longitude", "long"],
    _yFieldNames: ["y", "latitude", "lat"],

    postCreate: function() {
      this.inherited(arguments);

      // this._xFieldNames = ["x", "longitude", "long"];
      // this._yFieldNames = ["y", "latitude", "lat"];

      this._pointSymbol = new PictureMarkerSymbol({
        height: 24,
        xoffset: 0,
        yoffset: 12,
        width: 24,
        name: "RedStickpin",
        contentType: "image/png",
        type: "esriPMS",
        angle: 0,
        url: window.path + "images/RedStickpin.png"
      });

      this._lineSymbol = new SimpleLineSymbol({
        type: "esriSLS",
        style: "esriSLSSolid",
        color: [0, 102, 255],
        width: 2
      });

      this._polygonSymbol = new SimpleFillSymbol({
        type: "esriSFS",
        style: "esriSFSSolid",
        color: [153, 194, 255, 150],
        outline: {
          type: "esriSLS",
          style: "esriSLSSolid",
          color: [0, 102, 255],
          width: 2
        }
      });

      this._lineLayer = new GraphicsLayer();
      this._lineLayer.setVisibility(false);
      this.map.addLayer(this._lineLayer);

      this._polygonLayer = new GraphicsLayer();
      this._polygonLayer.setVisibility(false);
      this.map.addLayer(this._polygonLayer);

      this._pointLayer = new GraphicsLayer();
      this.map.addLayer(this._pointLayer);

      this.own(
        query(".draw-item", this.domNode).on(
          "click",
          lang.hitch(this, this._onDrawTypeItemClick)
        )
      );
      this.own(
        on(this.coordFile, "change", lang.hitch(this, this._onCoordFileChanged))
      );
    },

    _onCoordFileChanged: function(event) {
      var file = event.target.files[0];

      var reader = new FileReader();
      reader.onloadend = lang.hitch(this, function(event) {
        if (event.target.readyState === FileReader.DONE) {
          this._readCSV(event.target.result);
        }
      });

      reader.readAsText(file);
    },

    _readCSV: function(results) {
      var rowArray = results.split("\n");
      var columnArray = rowArray.map(function(row) {
        return row.split(",");
      });
      var xFieldIndex;
      var yFieldIndex;
      var header = columnArray[0];
      //获取经纬度字段名
      header.forEach(function(fieldName, index) {
        if (this._xFieldNames.indexOf(fieldName.toLowerCase()) >= 0) {
          xFieldIndex = index;
        } else if (this._yFieldNames.indexOf(fieldName.toLowerCase()) >= 0) {
          yFieldIndex = index;
        }
      }, this);

      if (xFieldIndex !== undefined && yFieldIndex !== undefined) {
        this._drawItem(xFieldIndex, yFieldIndex, columnArray);
      }
    },

    _drawItem: function(xFieldIndex, yFieldIndex, columnArray) {
      var header = columnArray[0];
      var path = [];
      var ring = [];

      for (var i = 1; i < columnArray.length; i++) {
        var columnData = columnArray[i];
        var x = columnData[xFieldIndex];
        var y = columnData[yFieldIndex];
        if (!isNaN(x) && !isNaN(y)) {
          var pointGraphic = new Graphic(new Point(x, y));
          pointGraphic.symbol = this._pointSymbol;
          var attributes = {};
          //将每行数据和第一行的字段名匹配, 组成object
          for (var j = 0; j < columnData.length; j++) {
            attributes[header[j]] = columnData[j];
          }
          pointGraphic.attributes = attributes;
          //弹出框显示所有字段
          pointGraphic.infoTemplate = new InfoTemplate("属性", "${*}");
          this._pointLayer.add(pointGraphic);

          path.push([x, y]);
          ring.push([x, y]);
        }
      }

      var lineGraphic = new Graphic(new Polyline([path]));
      lineGraphic.symbol = this._lineSymbol;
      this._lineLayer.add(lineGraphic);

      //如果第一个点和最后一个点坐标不一致, 就在最后加入第一个点构成闭环
      if (
        ring[0][0] !== ring[ring.length - 1][0] ||
        ring[0][1] !== ring[ring.length - 1][1]
      ) {
        ring.push(ring[0]);
      }
      var polygonGraphic = new Graphic(new Polygon([ring]));
      polygonGraphic.symbol = this._polygonSymbol;
      this._polygonLayer.add(polygonGraphic);
    },

    _onDrawTypeItemClick: function(event) {
      var target = event.target || event.srcElement;
      if (!domClass.contains(target, this._activeClass)) {
        query(".draw-item", this.domNode).removeClass(this._activeClass);
        domClass.add(target, this._activeClass);

        if (domClass.contains(target, "point-icon")) {
          this._currentType = "point";
          this._pointLayer.setVisibility(true);
          this._lineLayer.setVisibility(false);
          this._polygonLayer.setVisibility(false);
        } else if (domClass.contains(target, "polyline-icon")) {
          this._currentType = "polyline";
          this._pointLayer.setVisibility(false);
          this._lineLayer.setVisibility(true);
          this._polygonLayer.setVisibility(false);
        } else if (domClass.contains(target, "polygon-icon")) {
          this._currentType = "polygon";
          this._pointLayer.setVisibility(false);
          this._lineLayer.setVisibility(false);
          this._polygonLayer.setVisibility(true);
        }
      }
    },

    _onBtnClearClicked: function(event) {
      this._pointLayer.clear();
      this._lineLayer.clear();
      this._polygonLayer.clear();
    }
  });
});
