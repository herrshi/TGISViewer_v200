define([
  "dojo/_base/declare",
  "dojo/_base/array",
  "esri/graphic",
  "esri/geometry/Geometry",
  "esri/geometry/Point",
  "esri/geometry/Extent",
  "dojo/on",
  "dojo/_base/lang",
  "esri/Evented",
  "dojo/string",
  "dojo/dom",
  "dojo/dom-style",
  "dojo/dom-construct",
  "esri/domUtils",
  "esri/geometry/screenUtils",
  "jimu/BaseWidget",
  "esri/tasks/IdentifyTask",
  "esri/tasks/IdentifyParameters",
  "esri/layers/ArcGISDynamicMapServiceLayer",
  "dojo/domReady!"
], function(
  declare,
  array,
  Graphic,
  Geometry,
  Point,
  Extent,
  on,
  lang,
  Evented,
  string,
  dom,
  domStyle,
  domConstruct,
  domUtils,
  screenUtils,
  BaseWidget,
  IdentifyTask,
  IdentifyParameters,
  ArcGISDynamicMapServiceLayer
) {
  return declare([BaseWidget], {
    _text: null,
    _node: null,
    _mapPoint: null,
    _layer: null,
    _width: null,
    _height: null,
    _offsetX: null,
    _offsetY: null,
    _offset: 25,
    _place: "right",
    _iconOffsetX: 0,
    _iconOffsetY: 0,
    _label: null,
    postCreate: function() {
      this.inherited(arguments);
      this.map.on("click", lang.hitch(this, this._onLayerClick));
    },
    init: function() {
      if (this._mapPoint) {
        this.drawText();
        this._onEvent();
      }
    },
    _onLayerClick: function(event) {
      if (this._node) {
        domConstruct.destroy(this._node);
      }
      this._mapPoint = event.mapPoint;
      if (event.graphic) {
        this._label = event.graphic.getLayer().label;
        this.setContext(event.graphic);
      } else {
        array.forEach(
          this.map.layerIds,
          function(layerId) {
            var layer = this.map.getLayer(layerId);
            if (
              layer instanceof ArcGISDynamicMapServiceLayer &&
              layer.visibleAtMapScale &&
              layer.visible
            ) {
              this._label = layer.label;
              var layerUrl = layer.url;
              var identifyTask = new IdentifyTask(layerUrl);
              var identifyParam = new IdentifyParameters();
              identifyParam.width = this.map.width;
              identifyParam.height = this.map.height;
              identifyParam.mapExtent = this.map.extent;
              identifyParam.returnGeometry = true;
              identifyParam.layerOption =
                IdentifyParameters.LAYER_OPTION_VISIBLE;
              identifyParam.tolerance = 3;
              identifyParam.geometry = event.mapPoint;
              // identifyParam.geometry = (this.map.spatialReference.isWebMercator() ? webMercatorUtils.webMercatorToGeographic(event.mapPoint) : event.mapPoint);
              identifyTask.execute(identifyParam).then(
                lang.hitch(this, function(identifyResults) {
                  if (identifyResults.length > 0) {
                    var feature = identifyResults[0].feature;

                    this.setContext(feature, identifyResults[0].layerName);
                  }
                }),
                function(error) {
                  console.log(error);
                }
              );
            }
          },
          this
        );
      }
    },
    setContext: function(graphic) {
      var label=this._label;
      var context;
      for (var i = 0; i < this.config.tooltips.length; i++) {
        var tooltip = this.config.tooltips[i];
        if (tooltip.label === label) {
          context = tooltip.context;
          if (tooltip.offsetx) {
            this._iconOffsetX = tooltip.offsetx;
          }
          if (tooltip.offsety) {
            this._iconOffsetY = tooltip.offsety;
          }
          break;
        }
      }
      if (context === undefined) {
        return;
      }
      context = context.replace(/\./g, "_");
      var contextObj = {};
      for (var field in graphic.attributes) {
        contextObj[
          field
            .toString()
            .replace(/\./g, "_")
            .toString()
        ] =
          graphic.attributes[field] == null ? "" : graphic.attributes[field];
      }
      var text = string.substitute(context, contextObj);
      var divClass = this._place == "top" ? "TextTriTop" : "TextTriRight";
      if (text.toString().indexOf("</") > -1) {
        this._node = text;
      } else {
        text = text.replace(/\n/g, "<br/>");
        this._node = domConstruct.toDom(
          "<div class='MapText TextDiv'><span>" +
            text +
            "</span><div class='" +
            divClass +
            "'></div></div>"
        );
      }
      this.init();
    },
    getCenter: function(gra) {
      var type = gra.geometry.type;
      var point;
      if (type == "point") {
        point = gra.geometry;
      } else if (type == "polyline") {
        point = gra.geometry.getPoint(0, 0);
      } else if (type == "polygon") {
        point = gra.geometry.getCentroid();
      } else if (type == "extent") {
        point = gra.geometry.getCenter();
      } else if (type == "multipoint") {
        point = gra.geometry.getPoint(0);
      }
      return point;
    },
    _onEvent: function() {
      this.map.on("pan", lang.hitch(this, this._panEvent));
      this.map.on("zoom-start", lang.hitch(this, this._zoomStartEvent));
      this.map.on("zoom-end", lang.hitch(this, this._zoomEvent));
      //on(this.map, "zoom", lang.hitch(this, this._zoomEvent));
    },
    _panEvent: function(e) {
      this.panchangeText(e);
    },
    _zoomStartEvent: function(e) {
      this._hide();
    },
    _zoomEvent: function(e) {
      this.zoomchangeText(e);
      this._show();
    },
    hide: function() {
      this._hide();
    },
    _hide: function() {
      domUtils.hide(this._node);
    },
    show: function() {
      this._show();
    },
    _show: function() {
      domUtils.show(this._node);
    },
    getScreentPoint: function() {
      var screenPoint;
      if (this._mapPoint) {
        //screenPoint = this.map.toScreen(this._mapPoint);
        screenPoint = screenUtils.toScreenPoint(
          this.map.extent,
          this.map.width,
          this.map.height,
          this._mapPoint
        );
      }
      return screenPoint;
    },
    drawText: function() {
      var ss = this.map.root; //this._layer.container;//dom.byId(this._gl.id);
      ss.appendChild(this._node);

      var xy = this.getScreentPoint();

      this._width = this._node.offsetWidth;
      this._height = this._node.offsetHeight;
      this.setOffset();

      domStyle.set(this._node, {
        left: xy.x + this._offsetX + this._iconOffsetX + "px",
        top: xy.y + this._offsetY + this._iconOffsetY + "px",
        position: "absolute",
        zIndex: "1"
      });
    },
    setOffset: function() {
      if (this._place == "top") {
        this._offsetX = 0 - this._width / 2;
        this._offsetY = 0 - this._height - this._offset;
      } else if (this._place == "bottom") {
        this._offsetX = 0 - this._width / 2;
        this._offsetY = this._offset;
      } else if (this._place == "left") {
        this._offsetX = 0 - this._width - this._offset;
        this._offsetY = 0 - this._height / 2;
      } else if (this._place == "right") {
        this._offsetX = this._offset;
        this._offsetY = 0 - this._height / 2;
      } else if (this._place == "top_left") {
        this._offsetX = 0 - this._width - this._offset;
        this._offsetY = 0 - this._height - this._offset;
      } else if (this._place == "top_right") {
        this._offsetX = this._offset;
        this._offsetY = 0 - this._height - this._offset;
      } else if (this._place == "bottom_left") {
        this._offsetX = 0 - this._width - this._offset;
        this._offsetY = this._offset;
      } else if (this._place == "bottom_right") {
        this._offsetX = this._offset;
        this._offsetY = this._offset;
      }
    },
    panchangeText: function(e) {
      var dx = e.delta.x;
      var dy = e.delta.y;
      var dd = this.getScreentPoint();
      domStyle.set(this._node, {
        left: dd.x + dx + this._offsetX + "px",
        top: dd.y + dy + this._offsetY + "px"
      });
    },
    zoomchangeText: function(e) {
      var dx = e.anchor.x;
      var dy = e.anchor.y;
      var dd = this.getScreentPoint();
      domStyle.set(this._node, {
        left: dd.x + this._offsetX + "px",
        top: dd.y + this._offsetY + "px"
      });
    },
    clear: function() {
      domConstruct.destroy(this._node);
    },
    startup: function() {}
  });
});
