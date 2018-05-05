define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/dom-class",
  "dojo/on",
  "dojo/query",
  "jimu/BaseWidget",
  "esri/geometry/Point",
  "esri/symbols/PictureMarkerSymbol",
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
  PictureMarkerSymbol,
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
    _graphicsLayer: null,

    postCreate: function() {
      this.inherited(arguments);

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

      this._graphicsLayer = new GraphicsLayer();
      this.map.addLayer(this._graphicsLayer);

      this.own(
        query(".draw-item", this.domNode).on(
          "click",
          lang.hitch(this, this._onDrawItemClick)
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
        if (
          fieldName.toLowerCase() === "x" ||
          fieldName.toLowerCase() === "longitude" ||
          fieldName.toLowerCase() === "long"
        ) {
          xFieldIndex = index;
        } else if (
          fieldName.toLowerCase() === "y" ||
          fieldName.toLowerCase() === "latitude" ||
          fieldName.toLowerCase() === "lat"
        ) {
          yFieldIndex = index;
        }
      });

      if (xFieldIndex && yFieldIndex) {
        for (var i = 1; i < columnArray.length; i++) {
          var x = columnArray[i][xFieldIndex];
          var y = columnArray[i][yFieldIndex];
          if (!isNaN(x) && !isNaN(y)) {
            var point = new Point(x, y);
            var graphic = new Graphic(point);
            graphic.symbol = this._pointSymbol;
            var attributes = {};
            for (var j = 0; j < columnArray[i].length; j++) {
              attributes[header[j]] = columnArray[i][j];
            }
            graphic.attributes = attributes;
            graphic.infoTemplate = new InfoTemplate("属性", "${*}");
            this._graphicsLayer.add(graphic);
          }
        }
      }
    },

    _onDrawItemClick: function(event) {
      var target = event.target || event.srcElement;
      if (!domClass.contains(target, this._activeClass)) {
        query(".draw-item", this.domNode).removeClass(this._activeClass);
        domClass.add(target, this._activeClass);

        if (domClass.contains(target, "point-icon")) {
          this._currentType = "point";
        } else if (domClass.contains(target, "polyline-icon")) {
          this._currentType = "polyline";
        } else if (domClass.contains(target, "polygon-icon")) {
          this._currentType = "polygon";
        }
      }
    },

    _onBtnClearClicked: function(event) {
      this._graphicsLayer.clear();
    }
  });
});
