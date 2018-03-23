define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/dom-class",
  "dojo/on",
  "dojo/query",
  "jimu/BaseWidget"
], function (
  declare,
  lang,
  domClass,
  on,
  query,
  BaseWidget
) {
  return declare([BaseWidget], {
    name: "DrawByCoordinate",
    baseClass: "jimu-widget-drawByCoordinate",

    _activeClass: "jimu-state-active",
    _currentType: "point",

    postCreate: function () {
      this.inherited(arguments);

      this.own(query(".draw-item", this.domNode).on("click", lang.hitch(this, this._onDrawItemClick)));
      this.own(on(this.coordFile, "change", lang.hitch(this, this._onCoordFileChanged)));

    },

    _onCoordFileChanged: function (event) {
      var file = event.target.files[0];

      var reader = new FileReader();
      reader.onloadend = lang.hitch(this, function (event) {
        if (event.target.readyState === FileReader.DONE) {
         this._drawGeometry(this._readCSV(event.target.result));
        }
      });

      reader.readAsText(file);
    },

    _readCSV: function (results) {
      var rowArray = results.split("\n");
      var columnArray = rowArray.map(function (row) {
        return row.split(",");
      });
      var xFieldIndex;
      var yFieldIndex;
      var header = columnArray[0];
      //获取经纬度字段名
      header.forEach(function (fieldName, index) {
        if (fieldName.toLowerCase() === "x" || fieldName.toLowerCase() === "longitude" || fieldName.toLowerCase() === "long") {
          xFieldIndex = index;
        }
        else if (fieldName.toLowerCase() === "y" || fieldName.toLowerCase() === "latitude" || fieldName.toLowerCase() === "lat") {
          yFieldIndex = index;
        }
      });

      var coordArray = [];
      if (xFieldIndex && yFieldIndex) {
        for (var i = 1; i < columnArray.length; i++) {
          coordArray.push([columnArray[i][xFieldIndex], columnArray[i][yFieldIndex]]);
        }
      }
      return coordArray;
    },

    _drawGeometry: function (coordArray) {
      switch (this._currentType) {
        case "point":
          coordArray.forEach(function (row) {
            
          });
          break;

        case "polyline":

          break;

        case "polygon":

          break;
      }
    },

    _onDrawItemClick: function (event) {
      var target = event.target || event.srcElement;
      if (!domClass.contains(target, this._activeClass)) {
        query(".draw-item", this.domNode).removeClass(this._activeClass);
        domClass.add(target, this._activeClass);

        if (domClass.contains(target, "point-icon")) {
          this._currentType = "point";
        }
        else if (domClass.contains(target, "polyline-icon")) {
          this._currentType = "polyline";
        }
        else if (domClass.contains(target, "polygon-icon")) {
          this._currentType = "polygon";
        }
      }
    }
  });
});