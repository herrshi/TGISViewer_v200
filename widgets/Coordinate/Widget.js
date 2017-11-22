/**
 * Created by herrshi on 2017/6/20.
 */
define([
  "dojo/_base/declare",
  "dojo/_base/html",
  "dojo/_base/lang",
  "dojo/on",
  "dojo/dom-class",
  "dojo/Deferred",
  "dijit/_WidgetsInTemplateMixin",
  "jimu/BaseWidget",
  "jimu/utils",
  "esri/layers/GraphicsLayer",
  "esri/request",
  "esri/geometry/webMercatorUtils"
], function (
  declare,
  html,
  lang,
  on,
  domClass,
  Deferred,
  _WidgetsInTemplateMixin,
  BaseWidget,
  jimuUtils,
  GraphicsLayer,
  esriRequest,
  webMercatorUtils
) {
  var jimuUnitToNlsLabel = {
    "INCHES": "Inches",
    "FOOT": "Foot",
    "FEET": "Foot",
    "YARDS": "Yards",
    "MILES": "Miles",
    "NAUTICAL_MILES": "Nautical_Miles",
    "MILLIMETERS": "Millimeters",
    "CENTIMETERS": "Centimeters",
    "METER": "Meter",
    "METERS": "Meter",
    "KILOMETERS": "Kilometers",
    "DECIMETERS": "Decimeters",
    "DEGREE": "Decimal_Degrees",
    "DECIMAL_DEGREES": "Decimal_Degrees",
    "DEGREE_MINUTE_SECONDS": "Degree_Minutes_Seconds",
    "MGRS": "MGRS",
    "USNG": "USNG"
  };

  var esriUnitsToJimuUnit = {
    "esriCentimeters": "CENTIMETERS",
    "esriDecimalDegrees": "DECIMAL_DEGREES",
    "esriDegreeMinuteSeconds": "DEGREE_MINUTE_SECONDS",
    "esriDecimeters": "DECIMETERS",
    "esriFeet": "FOOT",
    "esriInches": "INCHES",
    "esriKilometers": "KILOMETERS",
    "esriMeters": "METER",
    "esriMiles": "MILES",
    "esriMillimeters": "MILLIMETERS",
    "esriNauticalMiles": "NAUTICAL_MILES",
    "esriPoints": "POINTS",
    "esriUnknownUnits": "UNKNOWN",
    "esriYards": "YARDS"
  };


  var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
    baseClass: "jimu-widget-coordinate",
    name: "Coordinate",
    mapUnit: null,

    postMixInProperties: function() {
      this.nls.enableClick = this.nls.enableClick ||
        "Click to enable clicking map to get coordinates";
      this.nls.disableClick = this.nls.disableClick ||
        "Click to disable clicking map to get coordinates";
    },

    postCreate: function() {
      this.inherited(arguments);
      domClass.add(this.coordinateBackground, "coordinate-background");
      this.own(on(this.map, "extent-change", lang.hitch(this, this.onExtentChange)));
      this.own(on(this.map, "mouse-move", lang.hitch(this, this.onMouseMove)));
      // this.own(on(this.map, "click", lang.hitch(this, this.onMapClick)));
      // this.own(on(this.locateButton, "click", lang.hitch(this, this.onLocateButtonClick)));
      // this.own(on(this.foldContainer, "click", lang.hitch(this, this.onFoldContainerClick)));
      this.graphicsLayer = new GraphicsLayer();
      this.map.addLayer(this.graphicsLayer);
    },

    startup: function() {
      this.inherited(arguments);
      this._mapWkid = this.map.spatialReference.isWebMercator() ?
        3857 : this.map.spatialReference.wkid;
      this.selectedWkid = this._mapWkid;

      if (!(this.config.spatialReferences && this.config.spatialReferences.length > 1)) {
        html.setStyle(this.foldableNode, "display", "none");
      } else {
        html.setStyle(this.foldableNode, "display", "inline-block");
      }
    },

    onOpen: function() {
      this._processData().then(lang.hitch(this, function(mapData) {
        this.mapUnit = esriUnitsToJimuUnit[mapData.units];

      }), lang.hitch(this, function(err) {
        console.error(err);
      }));
    },

    _processData: function() {
      var def = new Deferred();
      var basemap = this.map.getLayer(this.map.layerIds[0]);
      if (basemap && basemap.url) {
        esriRequest({
          url: basemap.url,
          handleAs: "json",
          callbackParamName: "callback",
          content: {
            f: "json"
          }
        }).then(lang.hitch(this, function (mapData) {
          def.resolve(mapData);
        }));
      }

      return def;
    },

    onExtentChange: function(evt) {
      var cPos = html.position(this.domNode);
      var mPos = html.position(this.map.root);

      if (cPos.x - mPos.x <= 0 || (cPos.x - mPos.x + cPos.w) + 5 >= mPos.w) {
        if ("left" in this.position) {
          html.setStyle(this.domNode, "left", "5px");
        } else {
          html.setStyle(this.domNode, "right", "5px");
        }
      }
    },

    _unitToNls: function(outUnit) {
      var nlsLabel = jimuUnitToNlsLabel[outUnit.toUpperCase()];
      return this.nls[nlsLabel] || this.nls[outUnit] || outUnit;
    },

    onMouseMove: function(evt) {
      var mapPoint = evt.mapPoint;
      if (this._mapWkid === 3857) {
        mapPoint = webMercatorUtils.webMercatorToGeographic(mapPoint);
        this._displayDegOrDms("DECIMAL_DEGREES", mapPoint.y, mapPoint.x);
      }
      else {
        this._displayCoordinatesByOrder(this._toFormat(mapPoint.x), this._toFormat(mapPoint.y));
      }

    },

    destroy: function() {
      if (this._markerGraphic) {
        this.graphicsLayer.remove(this._markerGraphic);
      }
      if (this.graphicsLayer) {
        this.map.removeLayer(this.graphicsLayer);
      }

      this.inherited(arguments);
    },

    _displayCoordinatesByOrder: function(x, y) {
      var displayOrderLonLat = this.config.displayOrderLonLat;//X,Y
      if (displayOrderLonLat) {
        this.coordinateInfo.innerHTML = x + "  " + y;
      } else {
        this.coordinateInfo.innerHTML = y + "  " + x;
      }
    },

    _displayDegOrDms: function(outUnit, y, x) {
      var lat_string = "";
      var lon_string = "";
      // var options = this.selectedItem.get("options");
      //
      // x = x * options.unitRate;
      // y = y * options.unitRate;

      if ("DEGREE_MINUTE_SECONDS" === outUnit) {
        lat_string = this.degToDMS(y, "LAT");
        lon_string = this.degToDMS(x, "LON");
        this._displayCoordinatesByOrder(lat_string, lon_string);
      } else {
        this._displayCoordinatesByOrder(this._toFormat(x), this._toFormat(y));

        if (isNaN(y) && isNaN(x)) {
          this.coordinateInfo.innerHTML = "";
        } else {
          this.coordinateInfo.innerHTML += " " + this._unitToNls(outUnit);
        }
      }
    },

    /**
     * Helper function to prettify decimal degrees into DMS (degrees-minutes-seconds).
     *
     * @param {number} decDeg The decimal degree number
     * @param {string} decDir LAT or LON
     *
     * @return {string} Human-readable representation of decDeg.
     */
    degToDMS: function(decDeg, decDir) {
      /** @type {number} */
      var d = Math.abs(decDeg);
      /** @type {number} */
      var deg = Math.floor(d);
      d = d - deg;
      /** @type {number} */
      var min = Math.floor(d * 60);
      /** @type {number} */
      var sec = Math.floor((d - min / 60) * 60 * 60);
      if (sec === 60) { // can happen due to rounding above
        min++;
        sec = 0;
      }
      if (min === 60) { // can happen due to rounding above
        deg++;
        min = 0;
      }
      /** @type {string} */
      var min_string = min < 10 ? "0" + min : min;
      /** @type {string} */
      var sec_string = sec < 10 ? "0" + sec : sec;
      /** @type {string} */
      var dir = (decDir === "LAT") ? (decDeg < 0 ? "S" : "N") : (decDeg < 0 ? "W" : "E");

      return (decDir === "LAT") ?
        deg + "&deg;" + min_string + "&prime;" + sec_string + "&Prime;" + dir :
        deg + "&deg;" + min_string + "&prime;" + sec_string + "&Prime;" + dir;
    },

    _toFormat: function(num) {
      /*var decimalPlaces = isFinite(parseInt(this.config.decimalPlaces, 10)) ?
       parseInt(this.config.decimalPlaces, 10) : 3;
       var decimalStr = num.toString().split(".")[1] || "",
       decimalLen = decimalStr.length,
       patchStr = "",
       fix = decimalLen < decimalPlaces ? decimalLen : decimalPlaces;

       if (decimalLen < decimalPlaces) {
       patchStr = Array.prototype.join.call({
       length: decimalPlaces - decimalLen + 1
       }, "0");
       }

       num = num.toFixed(fix) + patchStr;
       return this.separator(num, decimalPlaces);*/
      if(isNaN(num)){
        return "";
      }

      return jimuUtils.localizeNumberByFieldInfo(num, {
        format: {
          places: this.config.decimalPlaces,
          digitSeparator: this.config.addSeparator
        }
      });
    }
  });

  return clazz;
});